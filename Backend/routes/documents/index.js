const express = require('express');
const mongoose = require('mongoose');

const requireAuth = require('../../middleware/auth');
const Document = require('../../models/Document');
const { getDocumentTextView, DocumentQaError } = require('../../services/ai/documentQaService');

const router = express.Router();

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

router.get('/', requireAuth, async (req, res) => {
  try {
    const documents = await Document.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .select('originalName fileName mimeType size url createdAt');

    return res.status(200).json({
      documents: documents.map((document) => ({
        id: document._id,
        originalName: document.originalName,
        fileName: document.fileName,
        mimeType: document.mimeType,
        size: document.size,
        url: document.url,
        uploadedAt: document.createdAt,
      })),
    });
  } catch (error) {
    console.error('Fetch documents error:', error);
    return res.status(500).json({ message: 'Server error, unable to fetch documents.' });
  }
});

module.exports = router;
