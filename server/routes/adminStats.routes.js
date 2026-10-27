import { Router } from 'express';
import { getOverviewStats, getTodayStats } from '../controllers/adminStats.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();

router.use(authenticate, requireRole('admin'));
router.get('/overview', getOverviewStats);
router.get('/today', getTodayStats);

export default router;
