const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    citations: {
      type: [
        new mongoose.Schema(
          {
            documentId: {
              type: mongoose.Schema.Types.ObjectId,
              required: true,
            },
            documentName: {
              type: String,
              required: true,
              trim: true,
            },
            chunkIndex: {
              type: Number,
              required: true,
              min: 0,
            },
            excerpt: {
              type: String,
              required: true,
              trim: true,
            },
            startChar: {
              type: Number,
              min: 0,
            },
            endChar: {
              type: Number,
              min: 0,
            },
          },
          { _id: false }
        ),
      ],
      default: undefined,
    },
    answerSegments: {
      type: [
        new mongoose.Schema(
          {
            text: {
              type: String,
              required: true,
              trim: true,
            },
            citations: {
              type: [
                new mongoose.Schema(
                  {
                    documentId: {
                      type: mongoose.Schema.Types.ObjectId,
                      required: true,
                    },
                    documentName: {
                      type: String,
                      required: true,
                      trim: true,
                    },
                    chunkIndex: {
                      type: Number,
                      required: true,
                      min: 0,
                    },
                    excerpt: {
                      type: String,
                      required: true,
                      trim: true,
                    },
                    startChar: {
                      type: Number,
                      min: 0,
                    },
                    endChar: {
                      type: Number,
                      min: 0,
                    },
                  },
                  { _id: false }
                ),
              ],
              default: undefined,
            },
          },
          { _id: false }
        ),
      ],
      default: undefined,
    },
  },
  {
    _id: false,
  }
);

const chatHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

chatHistorySchema.index({ user: 1, document: 1 }, { unique: true });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
