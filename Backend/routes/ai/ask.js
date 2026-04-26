const express = require('express');

const requireAuth = require('../../middleware/auth');
const { askDocumentQuestion, DocumentQaError } = require('../../services/ai/documentQaService');

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  try {
    const { documentId, documentIds, historyDocumentId, question } = req.body || {};

    const hasDocuments =
      (Array.isArray(documentIds) && documentIds.length > 0) || Boolean(documentId);

    if (!hasDocuments || !question) {
      return res.status(400).json({ message: 'Please provide at least one document and a question.' });
    }

    const answer = await askDocumentQuestion({
      documentId,
      documentIds,
      historyDocumentId,
      question,
      userId: req.user.userId,
    });

    return res.status(200).json(answer);
  } catch (error) {
    if (error instanceof DocumentQaError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error('Ask AI error:', error);
    return res.status(500).json({
      message: error.message || 'Server error, unable to answer this question.',
    });
  }
});

module.exports = router;
