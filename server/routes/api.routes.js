import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import bookingsRoutes from './bookings.routes.js';
import roomsRoutes from './rooms.routes.js';
import userRoutes from './user.routes.js';

const router = Router();
router.get('/health', getHealth);
router.use('/auth', authRoutes);
router.use('/rooms', roomsRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/user', userRoutes);
router.use('/admin', adminRoutes);

export default router;
