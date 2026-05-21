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
const TOP_K_CHUNKS = 6;
const VECTOR_INDEX_NAME = process.env.ATLAS_VECTOR_INDEX || 'document_chunk_vector_index';
const VECTOR_SEARCH_CANDIDATES = 120;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const GEMINI_MAX_RETRIES = 3;
const GEMINI_RETRY_DELAY_MS = 1200;
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
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

const normalizeDocumentIds = (documentIds = [], documentId) => {
  const inputIds = Array.isArray(documentIds) && documentIds.length > 0
    ? documentIds
    : [documentId];

  const normalizedIds = Array.from(
    new Set(
      inputIds
        .filter(Boolean)
        .map((value) => String(value))
    )
  );

  if (normalizedIds.length === 0) {
    throw new DocumentQaError('At least one valid documentId is required.', 400);
  }

  if (normalizedIds.some((value) => !mongoose.Types.ObjectId.isValid(value))) {
    throw new DocumentQaError('Each documentId must be valid.', 400);
  }

  return normalizedIds;
};

const validateAskInput = ({ documentIds, documentId, historyDocumentId, question }) => {
  const normalizedDocumentIds = normalizeDocumentIds(documentIds, documentId);

  if (!question || typeof question !== 'string' || !question.trim()) {
    throw new DocumentQaError('A question is required.', 400);
  }

  if (historyDocumentId && !mongoose.Types.ObjectId.isValid(historyDocumentId)) {
    throw new DocumentQaError('historyDocumentId must be valid.', 400);
  }

  if (!geminiApiKey) {
    throw new DocumentQaError('GEMINI_API_KEY or GOOGLE_API_KEY is not configured.', 500);
  }

  return normalizedDocumentIds;
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

const loadUserDocuments = async ({ documentIds, userId }) => {
  const documents = await Document.find({
    _id: { $in: documentIds },
    user: userId,
  }).select('originalName mimeType storageId bucketName');

  const documentsById = new Map(
    documents.map((document) => [String(document._id), document])
  );
  const orderedDocuments = documentIds.map((documentId) => documentsById.get(String(documentId)));

  if (orderedDocuments.some((document) => !document)) {
    throw new DocumentQaError('One or more documents were not found.', 404);
  }

  orderedDocuments.forEach((document) => {
    if (!SUPPORTED_MIME_TYPES.has(document.mimeType)) {
      throw new DocumentQaError(
        'AI questions currently support PDF, DOCX, and TXT documents only.',
        400
      );
    }
  });

  return orderedDocuments;
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
          citations: Array.isArray(message.citations)
            ? message.citations.map((citation) => ({
                documentId: citation.documentId,
                documentName: citation.documentName,
                chunkIndex: citation.chunkIndex,
                excerpt: citation.excerpt,
                startChar: citation.startChar,
                endChar: citation.endChar,
              }))
            : [],
          answerSegments: Array.isArray(message.answerSegments)
            ? message.answerSegments.map((segment) => ({
                text: segment.text,
                citations: Array.isArray(segment.citations)
                  ? segment.citations.map((citation) => ({
                      documentId: citation.documentId,
                      documentName: citation.documentName,
                      chunkIndex: citation.chunkIndex,
                      excerpt: citation.excerpt,
                      startChar: citation.startChar,
                      endChar: citation.endChar,
                    }))
                  : [],
              }))
            : [],
        }))
      : [],
  };
};

const saveChatExchange = async ({
  documentId,
  userId,
  question,
  answer,
  citations = [],
  answerSegments = [],
}) => {
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
              citations,
              answerSegments,
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

const normalizeForSearch = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractSearchTerms = (value) => {
  const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'do', 'for', 'from', 'how', 'in', 'is',
    'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'what', 'when', 'where',
    'which', 'who', 'why', 'with', 'you', 'your',
  ]);

  return Array.from(
    new Set(
      normalizeForSearch(value)
        .split(' ')
        .filter((term) => term.length > 2 && !STOP_WORDS.has(term))
    )
  );
};

const scoreChunkRelevance = (chunkContent, questionTerms) => {
  const normalizedChunk = normalizeForSearch(chunkContent);

  return questionTerms.reduce((score, term) => {
    if (!normalizedChunk.includes(term)) {
      return score;
    }

    const exactWordRegex = new RegExp(`\\b${term}\\b`, 'g');
    const exactMatches = normalizedChunk.match(exactWordRegex)?.length || 0;

    return score + 3 + exactMatches;
  }, 0);
};

const rerankChunksForQuestion = (chunks, question) => {
  const questionTerms = extractSearchTerms(question);

  return [...chunks]
    .map((chunk, index) => ({
      chunk,
      originalIndex: index,
      lexicalScore: scoreChunkRelevance(chunk.content, questionTerms),
      vectorScore: typeof chunk.score === 'number' ? chunk.score : 0,
    }))
    .sort((left, right) => {
      if (right.lexicalScore !== left.lexicalScore) {
        return right.lexicalScore - left.lexicalScore;
      }

      if (right.vectorScore !== left.vectorScore) {
        return right.vectorScore - left.vectorScore;
      }

      return left.originalIndex - right.originalIndex;
    })
    .map((entry) => entry.chunk)
    .slice(0, TOP_K_CHUNKS);
};

const tryParseJson = (value) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    const match = String(value).match(/```json\s*([\s\S]*?)```|({[\s\S]*})/);
    const candidate = match?.[1] || match?.[2];

    if (!candidate) {
      return null;
    }

    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
};

const buildCitationFromChunk = (chunk) => ({
  documentId: chunk.documentId,
  documentName: chunk.documentName,
  chunkIndex: chunk.chunkIndex,
  excerpt: chunk.content,
  startChar: chunk.metadata?.startChar,
  endChar: chunk.metadata?.endChar,
});

const mapAnswerSegments = (segments, relevantChunks) => {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [];
  }

  return segments
    .map((segment) => {
      const chunkRefs = Array.isArray(segment.citationChunkIndexes)
        ? segment.citationChunkIndexes
        : [];
      const citations = chunkRefs
        .map((chunkRef) => relevantChunks[Number(chunkRef) - 1])
        .filter(Boolean)
        .map((chunk) => buildCitationFromChunk(chunk));

      return {
        text: String(segment.text || '').trim(),
        citations,
      };
    })
    .filter((segment) => segment.text);
};

const buildFallbackAnswerSegments = (answer, citations) =>
  String(answer || '')
    .split(/(?<=[.!?])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => ({
      text: segment,
      citations,
    }));

const generateAnswer = async ({ documentNames, relevantChunks, question }) => {
  const context = relevantChunks
    .map(
      (chunk, index) =>
        `ChunkRef ${index + 1} | Document: ${chunk.documentName}\n${chunk.content}`
    )
    .join('\n\n')
    .slice(0, MAX_CONTEXT_CHARS);
  const response = await runGeminiRequest(
    () => ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        'You answer using only the provided document context.',
        'Answer the user\'s exact question, not a nearby question.',
        'Prefer the most directly relevant evidence from the context.',
        'Do not guess, generalize, or add outside knowledge.',
        'If the context is missing the answer, say that clearly.',
        'When possible, use precise wording from the document in short quoted fragments.',
        'Keep the answer concise, specific, and faithful to the source.',
        'Format the answer as clear Markdown with short sections or bullet points when helpful.',
        'Return valid JSON only.',
        'Use this JSON shape:',
        '{"answer":"string","segments":[{"text":"string","citationChunkIndexes":[1]}]}',
        'Each segment should be one sentence or one short claim.',
        'Each segment must cite the exact ChunkRef numbers that support it.',
        `Documents: ${documentNames.join(', ')}`,
        '',
        'Context:',
        context,
        '',
        `Question: ${question.trim()}`,
      ].join('\n'),
    }),
    'Gemini is experiencing high demand right now. Please try again in a moment.'
  );

  const parsed = tryParseJson(response?.text);
  const answer = String(parsed?.answer || response?.text || 'No answer returned.').trim();
  const fallbackCitations = relevantChunks.map((chunk) => buildCitationFromChunk(chunk));
  const answerSegments = mapAnswerSegments(parsed?.segments, relevantChunks);

  return {
    answer,
    answerSegments:
      answerSegments.length > 0
        ? answerSegments
        : buildFallbackAnswerSegments(answer, fallbackCitations),
  };
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

const attachChunkPositions = (chunks, text) => {
  let searchStart = 0;

  return chunks.map((chunk) => {
    const content = chunk.pageContent || '';
    let startChar = text.indexOf(content, searchStart);

    if (startChar === -1) {
      startChar = text.indexOf(content);
    }

    const endChar = startChar === -1 ? undefined : startChar + content.length;

    if (endChar !== undefined) {
      searchStart = endChar;
    }

    return {
      ...chunk,
      metadata: {
        ...chunk.metadata,
        startChar,
        endChar,
      },
    };
  });
};

const createChunkRecords = async ({ document, text, userId }) => {
  const splitChunks = await splitTextIntoChunks(text, document);
  const chunks = attachChunkPositions(splitChunks, text);

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

const enrichChunksWithDocument = (chunks, document) =>
  chunks.map((chunk) => {
    const baseChunk = typeof chunk.toObject === 'function' ? chunk.toObject() : chunk;

    return {
      ...baseChunk,
      documentId: document._id,
      documentName: document.originalName,
    };
  });

const ensureAllDocumentChunks = async ({ documentsWithText, userId }) => {
  const chunkGroups = await Promise.all(
    documentsWithText.map(async ({ document, text }) =>
      enrichChunksWithDocument(
        await ensureDocumentChunks({
          document,
          text,
          userId,
        }),
        document
      )
    )
  );

  return chunkGroups.flat();
};

const searchRelevantChunks = async ({ question, documentsWithText, userId }) => {
  const storedChunks = await ensureAllDocumentChunks({ documentsWithText, userId });
  const questionEmbedding = await embedText(question.trim());
  const documentIds = documentsWithText.map(({ document }) => document._id);
  const documentsById = new Map(
    documentsWithText.map(({ document }) => [String(document._id), document])
  );

  try {
    const vectorResults = await DocumentChunk.aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: 'embedding',
          queryVector: questionEmbedding,
          filter: {
            document: { $in: documentIds },
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
          document: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);

    if (vectorResults.length > 0) {
      return rerankChunksForQuestion(
        vectorResults.map((chunk) => ({
          ...chunk,
          documentId: chunk.document,
          documentName: documentsById.get(String(chunk.document))?.originalName || 'Unknown document',
        })),
        question
      );
    }
  } catch (error) {
    console.error('Atlas Vector Search fallback:', error.message);
  }

  return rerankChunksForQuestion(storedChunks, question);
};

const askDocumentQuestion = async ({ documentId, documentIds, historyDocumentId, question, userId }) => {
  const normalizedDocumentIds = validateAskInput({
    documentIds,
    documentId,
    historyDocumentId,
    question,
  });

  const documents = await loadUserDocuments({
    documentIds: normalizedDocumentIds,
    userId,
  });
  const documentsWithText = await Promise.all(
    documents.map(async (document) => {
      const fileBuffer = await readGridFsFile(document.storageId, document.bucketName);
      const extractedText = await extractDocumentText(document, fileBuffer);
      const normalizedText = extractedText.replace(/\s+/g, ' ').trim();

      if (!normalizedText) {
        throw new DocumentQaError(
          `No readable text was found in "${document.originalName}".`,
          400
        );
      }

      return {
        document,
        text: normalizedText,
      };
    })
  );

  const relevantChunks = await searchRelevantChunks({
    question,
    documentsWithText,
    userId,
  });
  const generatedAnswer = await generateAnswer({
    documentNames: documents.map((document) => document.originalName),
    relevantChunks,
    question,
  });
  const answer = generatedAnswer.answer;
  const citations = relevantChunks.map((chunk) => buildCitationFromChunk(chunk));
  const resolvedHistoryDocumentId = historyDocumentId || documents[0]._id;

  await saveChatExchange({
    documentId: resolvedHistoryDocumentId,
    userId,
    question,
    answer,
    citations,
    answerSegments: generatedAnswer.answerSegments,
  });

  return {
    answer,
    chunksUsed: relevantChunks.length,
    documentsUsed: documents.length,
    citations,
    answerSegments: generatedAnswer.answerSegments,
  };
};

const getDocumentTextView = async ({ documentId, userId }) => {
  const document = await loadUserDocument({ documentId, userId });
  const fileBuffer = await readGridFsFile(document.storageId, document.bucketName);
  const extractedText = await extractDocumentText(document, fileBuffer);
  const normalizedText = extractedText.replace(/\s+/g, ' ').trim();

  if (!normalizedText) {
    throw new DocumentQaError('No readable text was found in this document.', 400);
  }

  return {
    documentId: document._id,
    documentName: document.originalName,
    mimeType: document.mimeType,
    text: normalizedText,
  };
};

module.exports = {
  askDocumentQuestion,
  getDocumentChatHistory,
  getDocumentTextView,
  DocumentQaError,
};
