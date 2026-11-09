import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.routes';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('Unhandled Exception caught:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection caught:', reason);
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-gemini-key', 'x-openai-key']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Root Welcome & Status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: '🚀 DB Insight AI Backend Engine is running successfully on Render!',
    healthCheck: '/api/health',
    apiRoot: '/api',
    version: '1.0.0'
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DB Insight AI Backend Engine',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api', apiRoutes);

// Centralized Error Handling
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 DB Insight AI Backend running on http://localhost:${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
});
