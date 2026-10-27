import { Router } from 'express';
import { param } from 'express-validator';
import {
  completeMockPayment,
  createPendingPayment,
  getBookingPayments,
  refundMockPayment,
} from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../utils/validateRequest.js';

const router = Router();

router.post(
  '/bookings/:bookingId/payments',
  authenticate,
  param('bookingId').isMongoId().withMessage('Booking id is invalid.'),
  validateRequest,
  createPendingPayment,
);
router.get(
  '/bookings/:bookingId/payments',
  authenticate,
  param('bookingId').isMongoId().withMessage('Booking id is invalid.'),
  validateRequest,
  getBookingPayments,
);
router.post(
  '/payments/:paymentId/mock-complete',
  authenticate,
  param('paymentId').isMongoId().withMessage('Payment id is invalid.'),
  validateRequest,
  completeMockPayment,
);
router.post(
  '/payments/:paymentId/refund',
  authenticate,
  param('paymentId').isMongoId().withMessage('Payment id is invalid.'),
  validateRequest,
  refundMockPayment,
);

export default router;
