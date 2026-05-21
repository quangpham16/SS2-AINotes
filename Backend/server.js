const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

dotenv.config();

const registerRoute = require('./routes/auth/register');
const loginRoute = require('./routes/auth/login');
const askAiRoute = require('./routes/ai/ask');
const chatHistoryRoute = require('./routes/ai/history');
const uploadDocumentRoute = require('./routes/documents/upload');
const documentRoutes = require('./routes/documents');

const app = express();
const PORT = process.env.PORT || 5000;
const frontendDistPath = path.join(__dirname, '..', 'Frontend', 'dist');
const hasFrontendBuild = fs.existsSync(frontendDistPath);
const allowedOrigins = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .map((origin) => origin.replace(/\/+$/, ''))
  .filter(Boolean);
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

let mongoConnectionPromise;

app.use(express.json());

app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = origin?.replace(/\/+$/, '');

    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));
}

app.get('/', (_req, res) => {
  res.send('Backend is running');
});

app.get('/api/status', (_req, res) => {
  res.json({ message: 'API is ready' });
});

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!mongoUri) {
    throw new Error('MONGO_URI or MONGODB_URI is not configured.');
  }

  if (!mongoConnectionPromise) {
    mongoConnectionPromise = mongoose.connect(mongoUri).catch((error) => {
      mongoConnectionPromise = undefined;
      throw error;
    });
  }

  return mongoConnectionPromise;
}

app.use('/api', async (_req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    res.status(500).json({ message: 'Database connection failed.' });
  }
});

app.use('/api/auth/register', registerRoute);
app.use('/api/auth/login', loginRoute);
app.use('/api/ai/ask', askAiRoute);
app.use('/api/ai/history', chatHistoryRoute);
app.use('/api/documents', documentRoutes);
app.use('/api/documents/upload', uploadDocumentRoute);

if (hasFrontendBuild) {
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

async function startServer() {
  try {
    await connectDatabase();
    console.log('MongoDB connected');

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
