import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import sensorRoutes     from './routes/sensorRoutes.js';
import alertRoutes      from './routes/alertRoutes.js';
import detectionRoutes  from './routes/detectionRoutes.js';
import twinRoutes       from './routes/twinRoutes.js';
import reportRoutes     from './routes/reportRoutes.js';
import assistantRoutes  from './routes/assistantRoutes.js';

dotenv.config();

const app = express();

const frontendOrigin = process.env.FRONTEND_URL;
app.use(cors({ 
  origin: frontendOrigin ? [frontendOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'] : '*',
  exposedHeaders: ['Content-Disposition'] 
}));
app.use(express.json({ limit: '10mb' })); // base64 images can be large
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/sensors',    sensorRoutes);
app.use('/api/alerts',     alertRoutes);
app.use('/api/detections', detectionRoutes);
app.use('/api/twin',       twinRoutes);
app.use('/api/reports',    reportRoutes);
app.use('/api/assistant',  assistantRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'OK', timestamp: Date.now() }));

// Global error handler (must be last)
app.use(errorHandler);

export default app;
