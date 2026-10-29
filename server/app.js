import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { responseEnvelope } from './middleware/responseEnvelope.js';
import { uploadDirectory } from './middleware/upload.js';
import apiRoutes from './routes/api.routes.js';
import healthRoutes from './routes/health.routes.js';
import './config/env.js';

const app = express();

// Render terminates TLS at one trusted proxy before forwarding requests here.
// This lets rate limiting use the real client IP in production.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || false,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/api/health', healthRoutes);
app.use(responseEnvelope);
app.use('/uploads', express.static(uploadDirectory, {
  setHeaders(response) {
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again later.', data: null },
}));

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
