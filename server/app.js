import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import './config/env.js';
import { notFound } from './middleware/notFound.js';
import authRoutes from './routes/auth.routes.js';
import adminStatsRoutes from './routes/adminStats.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import roomRoutes from './routes/room.routes.js';

const app = express();

// Render terminates TLS at one trusted proxy before forwarding requests here.
// This lets rate limiting use the real client IP in production.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api', paymentRoutes);
app.use('/api/admin/stats', adminStatsRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
