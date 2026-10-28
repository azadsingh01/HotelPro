import { Router } from 'express';
import { getProfile } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import bookingsRoutes from './bookings.routes.js';
import roomsRoutes from './rooms.routes.js';

const router = Router();
router.use('/rooms', roomsRoutes);
router.use('/bookings', bookingsRoutes);
router.get('/profile', authenticate, requireRole('Ordinary'), getProfile);

export default router;
