const mongoose = require('mongoose');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { GoogleGenAI } = require('@google/genai');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

const Document = require('../../models/Document');
const ChatHistory = require('../../models/ChatHistory');
const DocumentChunk = require('../../models/DocumentChunk');

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const MAX_CONTEXT_CHARS = 12000;
const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;
const TOP_K_CHUNKS = 4;
const VECTOR_INDEX_NAME = process.env.ATLAS_VECTOR_INDEX || 'document_chunk_vector_index';
const VECTOR_SEARCH_CANDIDATES = 80;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const GEMINI_MAX_RETRIES = 3;
const GEMINI_RETRY_DELAY_MS = 1200;
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const loadPdfJs = async () => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  return {
    getDocument: pdfjs.getDocument,
    version: pdfjs.version,
  };
};

const extractDocxText = async (fileBuffer) => {
  try {
    const { extractRawText } = await import('mammoth');
    const result = await extractRawText({ buffer: fileBuffer });

    return result.value || '';
  } catch (error) {
    throw new DocumentQaError(
      'DOCX support is not installed on the server. Please install the `mammoth` package.',
      500
    );
  }
};

class DocumentQaError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'DocumentQaError';
    this.statusCode = statusCode;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseProviderError = (error) => {
  const rawMessage = error?.message || '';

  if (!rawMessage) {
    return null;
  }

  try {
    return JSON.parse(rawMessage);
  } catch {
    return null;
  }
};

const getProviderErrorMessage = (error) => {
  const parsed = parseProviderError(error);

  return (
    parsed?.error?.message ||
    parsed?.message ||
    error?.message ||
    'Unable to complete the AI request.'
  );
};

const isRetryableGeminiError = (error) => {
  const message = getProviderErrorMessage(error).toLowerCase();
  const parsed = parseProviderError(error);
  const status = parsed?.error?.status || parsed?.status || '';
  const code = Number(parsed?.error?.code);

  return (
    code === 503 ||
    status === 'UNAVAILABLE' ||
    status === 'RESOURCE_EXHAUSTED' ||
    message.includes('high demand') ||
    message.includes('temporarily unavailable') ||
    message.includes('unavailable')
  );
};

const runGeminiRequest = async (requestFn, fallbackMessage) => {
  let lastError;

  for (let attempt = 0; attempt < GEMINI_MAX_RETRIES; attempt += 1) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      if (!isRetryableGeminiError(error) || attempt === GEMINI_MAX_RETRIES - 1) {
        break;
      }

      await sleep(GEMINI_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  if (isRetryableGeminiError(lastError)) {
    throw new DocumentQaError(fallbackMessage, 503);
  }

  throw new DocumentQaError(getProviderErrorMessage(lastError), 500);
};

const validateAskInput = ({ documentId, question }) => {
  if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
    throw new DocumentQaError('A valid documentId is required.', 400);
  }

  if (!question || typeof question !== 'string' || !question.trim()) {
    throw new DocumentQaError('A question is required.', 400);
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new DocumentQaError('GEMINI_API_KEY is not configured.', 500);
  }
};

const loadUserDocument = async ({ documentId, userId }) => {
  const document = await Document.findOne({
    _id: documentId,
    user: userId,
  }).select('originalName mimeType storageId bucketName');

  if (!document) {
    throw new DocumentQaError('Document not found.', 404);
  }

  if (!SUPPORTED_MIME_TYPES.has(document.mimeType)) {
    throw new DocumentQaError(
      'AI questions currently support PDF, DOCX, and TXT documents only.',
      400
    );
  }

  return document;
};

const getDocumentChatHistory = async ({ documentId, userId }) => {
  const document = await loadUserDocument({ documentId, userId });
  const history = await ChatHistory.findOne({
    user: userId,
    document: document._id,
  }).select('messages');

  return {
    documentId: document._id,
    messages: Array.isArray(history?.messages)
      ? history.messages.map((message) => ({
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
        }))
      : [],
  };
};

const saveChatExchange = async ({ documentId, userId, question, answer }) => {
  await ChatHistory.findOneAndUpdate(
    {
      user: userId,
      document: documentId,
    },
    {
      $push: {
        messages: {
          $each: [
            {
              role: 'user',
              content: question.trim(),
              createdAt: new Date(),
            },
            {
              role: 'assistant',
              content: answer,
              createdAt: new Date(),
            },
          ],
        },
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
};

const readGridFsFile = async (storageId, bucketName) => {
  if (!mongoose.connection.db) {
    throw new DocumentQaError('Database connection is not ready.', 500);
  }

  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: bucketName || 'documents',
  });

  return new Promise((resolve, reject) => {
    const chunks = [];

    bucket
      .openDownloadStream(storageId)
      .on('data', (chunk) => chunks.push(chunk))
      .on('error', reject)
      .on('end', () => resolve(Buffer.concat(chunks)));
  });
};

const extractDocumentText = async (document, fileBuffer) => {
  if (document.mimeType === 'text/plain') {
    return fileBuffer.toString('utf8');
  }

  if (document.mimeType === 'application/pdf') {
    const loader = new PDFLoader(new Blob([fileBuffer], { type: document.mimeType }), {
      splitPages: false,
      pdfjs: loadPdfJs,
    });
    const docs = await loader.load();

    return docs.map((item) => item.pageContent).join('\n\n');
  }

  if (
    document.mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractDocxText(fileBuffer);
  }

  return '';
};

const getEmbeddingValues = (embeddingResponse, index = 0) => {
  const values =
    embeddingResponse?.embeddings?.[index]?.values ||
    embeddingResponse?.embedding?.values;

  if (!Array.isArray(values) || values.length === 0) {
    throw new DocumentQaError('Gemini did not return embeddings.', 500);
  }

  return values;
};

const embedText = async (text) => {
  const response = await runGeminiRequest(() => ai.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: [text],
  }), 'Gemini is busy right now. Please try your question again in a moment.');

  return getEmbeddingValues(response, 0);
};

const embedDocuments = async (texts) => {
  const response = await runGeminiRequest(() => ai.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: texts,
  }), 'Gemini is busy right now. Please try your question again in a moment.');

  return texts.map((_, index) => getEmbeddingValues(response, index));
};

const generateAnswer = async ({ documentName, context, question }) => {
  const response = await runGeminiRequest(
    () => ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        'You answer questions using only the provided document context.',
        'If the answer is not in the document, say that clearly.',
        'Keep answers concise and accurate.',
        `Document: ${documentName}`,
        '',
        'Context:',
        context,
        '',
        `Question: ${question.trim()}`,
      ].join('\n'),
    }),
    'Gemini is experiencing high demand right now. Please try again in a moment.'
  );

  return response?.text || 'No answer returned.';
};

const splitTextIntoChunks = async (text, document) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  return splitter.createDocuments([text], [
    {
      source: document.originalName,
    },
  ]);
};

const createChunkRecords = async ({ document, text, userId }) => {
  const chunks = await splitTextIntoChunks(text, document);

  if (!chunks.length) {
    throw new DocumentQaError('No readable text was found in this document.', 400);
  }

  const contents = chunks.map((chunk) => chunk.pageContent);
  const embeddings = await embedDocuments(contents);

  return chunks.map((chunk, index) => ({
    document: document._id,
    user: userId,
    chunkIndex: index,
    content: chunk.pageContent,
    embedding: embeddings[index],
    metadata: {
      source: document.originalName,
      ...chunk.metadata,
    },
  }));
};

const ensureDocumentChunks = async ({ document, text, userId }) => {
  const existingChunks = await DocumentChunk.find({
    document: document._id,
    user: userId,
  })
    .sort({ chunkIndex: 1 })
    .select('content embedding chunkIndex metadata');

  if (existingChunks.length > 0) {
    return existingChunks;
  }

  const chunkRecords = await createChunkRecords({ document, text, userId });
  await DocumentChunk.insertMany(chunkRecords, { ordered: true });

  return DocumentChunk.find({
    document: document._id,
    user: userId,
  })
    .sort({ chunkIndex: 1 })
    .select('content embedding chunkIndex metadata');
};

const searchRelevantChunks = async ({ question, text, document, userId }) => {
  const storedChunks = await ensureDocumentChunks({ document, text, userId });
  const questionEmbedding = await embedText(question.trim());

  try {
    const vectorResults = await DocumentChunk.aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: 'embedding',
          queryVector: questionEmbedding,
          filter: {
            document: document._id,
            user: new mongoose.Types.ObjectId(userId),
          },
          numCandidates: VECTOR_SEARCH_CANDIDATES,
          limit: TOP_K_CHUNKS,
        },
      },
      {
        $project: {
          content: 1,
          chunkIndex: 1,
          metadata: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);

    if (vectorResults.length > 0) {
      return vectorResults;
    }
  } catch (error) {
    console.error('Atlas Vector Search fallback:', error.message);
  }

  return storedChunks.slice(0, TOP_K_CHUNKS).map((chunk) => chunk.toObject());
};

const askDocumentQuestion = async ({ documentId, question, userId }) => {
  validateAskInput({ documentId, question });

  const document = await loadUserDocument({ documentId, userId });
  const fileBuffer = await readGridFsFile(document.storageId, document.bucketName);
  const extractedText = await extractDocumentText(document, fileBuffer);
  const normalizedText = extractedText.replace(/\s+/g, ' ').trim();

  if (!normalizedText) {
    throw new DocumentQaError('No readable text was found in this document.', 400);
  }

  const relevantChunks = await searchRelevantChunks({
    question,
    text: normalizedText,
    document,
    userId,
  });
  const context = relevantChunks
    .map((chunk, index) => `Chunk ${index + 1}:\n${chunk.content}`)
    .join('\n\n')
    .slice(0, MAX_CONTEXT_CHARS);
  const answer = await generateAnswer({
    documentName: document.originalName,
    context,
    question,
  });

  await saveChatExchange({
    documentId: document._id,
    userId,
    question,
    answer,
  });

  return {
    answer,
    chunksUsed: relevantChunks.length,
  };
};

module.exports = {
  askDocumentQuestion,
  getDocumentChatHistory,
  DocumentQaError,
};
