const express = require('express');
const mongoose = require('mongoose');

const requireAuth = require('../../middleware/auth');
const ChatHistory = require('../../models/ChatHistory');
const Document = require('../../models/Document');
const DocumentChunk = require('../../models/DocumentChunk');
const { getDocumentTextView, DocumentQaError } = require('../../services/ai/documentQaService');

const router = express.Router();

const serializeDocument = (document) => ({
  id: document._id,
  originalName: document.originalName,
  fileName: document.fileName,
  mimeType: document.mimeType,
  size: document.size,
  url: document.url,
  uploadedAt: document.createdAt,
});

router.get('/:documentId/download', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.documentId)) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const document = await Document.findOne({
      user: req.user.userId,
      storageId: req.params.documentId,
    }).select('originalName mimeType storageId bucketName');

    if (!document) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    if (!mongoose.connection.db) {
      return res.status(500).json({ message: 'Database connection is not ready.' });
    }

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(document.originalName)}"`
    );

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: document.bucketName || 'documents',
    });

    return bucket.openDownloadStream(document.storageId)
      .on('error', () => {
        if (!res.headersSent) {
          res.status(404).json({ message: 'Document file is unavailable.' });
        } else {
          res.end();
        }
      })
      .pipe(res);
  } catch (error) {
    console.error('Download document error:', error);
    return res.status(500).json({ message: 'Server error, unable to download document.' });
  }
});

router.get('/:documentId/text', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.documentId)) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const documentTextView = await getDocumentTextView({
      documentId: req.params.documentId,
      userId: req.user.userId,
    });

    return res.status(200).json(documentTextView);
  } catch (error) {
    if (error instanceof DocumentQaError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error('Fetch document text error:', error);
    return res.status(500).json({ message: 'Server error, unable to read document text.' });
  }
});

router.patch('/:documentId', requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { originalName } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ message: 'A valid documentId is required.' });
    }

    if (typeof originalName !== 'string' || !originalName.trim()) {
      return res.status(400).json({ message: 'Notebook name is required.' });
    }

    const sanitizedName = originalName.trim().slice(0, 180);
    const document = await Document.findOneAndUpdate(
      {
        _id: documentId,
        user: req.user.userId,
      },
      {
        originalName: sanitizedName,
      },
      {
        new: true,
        runValidators: true,
      }
    ).select('originalName fileName mimeType size url createdAt');

    if (!document) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    await Promise.allSettled([
      ChatHistory.updateMany(
        {
          user: req.user.userId,
          'messages.citations.documentId': document._id,
        },
        {
          $set: {
            'messages.$[].citations.$[citation].documentName': sanitizedName,
          },
        },
        {
          arrayFilters: [{ 'citation.documentId': document._id }],
        }
      ),
      ChatHistory.updateMany(
        {
          user: req.user.userId,
          'messages.answerSegments.citations.documentId': document._id,
        },
        {
          $set: {
            'messages.$[].answerSegments.$[].citations.$[citation].documentName': sanitizedName,
          },
        },
        {
          arrayFilters: [{ 'citation.documentId': document._id }],
        }
      ),
    ]);

    return res.status(200).json({
      message: 'Notebook renamed successfully.',
      document: serializeDocument(document),
    });
  } catch (error) {
    console.error('Rename document error:', error);
    return res.status(500).json({ message: 'Server error, unable to rename notebook.' });
  }
});

router.delete('/:documentId', requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ message: 'A valid documentId is required.' });
    }

    const document = await Document.findOne({
      _id: documentId,
      user: req.user.userId,
    }).select('storageId bucketName');

    if (!document) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    if (mongoose.connection.db && document.storageId) {
      try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: document.bucketName || 'documents',
        });
        await bucket.delete(document.storageId);
      } catch (gridFsError) {
        console.error('GridFS delete error:', gridFsError);
      }
    }

    await Promise.all([
      DocumentChunk.deleteMany({
        document: document._id,
        user: req.user.userId,
      }),
      ChatHistory.deleteMany({
        document: document._id,
        user: req.user.userId,
      }),
      Document.deleteOne({
        _id: document._id,
        user: req.user.userId,
      }),
    ]);

    return res.status(200).json({ message: 'Notebook deleted successfully.' });
  } catch (error) {
    console.error('Delete document error:', error);
    return res.status(500).json({ message: 'Server error, unable to delete notebook.' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const documents = await Document.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .select('originalName fileName mimeType size url createdAt');

    return res.status(200).json({
      documents: documents.map(serializeDocument),
    });
  } catch (error) {
    console.error('Fetch documents error:', error);
    return res.status(500).json({ message: 'Server error, unable to fetch documents.' });
  }
});

module.exports = router;
