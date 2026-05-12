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

app.use(cors());
app.use(express.json());
app.use(cors({
  origin: 'https://ss-2-group6.vercel.app', 
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
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

startServer();
