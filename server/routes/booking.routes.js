import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  cancelBooking,
  checkInBooking,
  checkOutBooking,
  createBooking,
  getAllBookings,
  getMyBookings,
} from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { parseDateOnly, validateStayDates } from '../utils/dateOnly.js';
import { validateRequest } from '../utils/validateRequest.js';

const router = Router();
const bookingStatuses = ['booked', 'checked_in', 'checked_out', 'cancelled'];

const dateValidation = (field) => body(field)
  .isString().withMessage(`${field} must be a date string.`)
  .bail()
  .custom((value) => parseDateOnly(value) !== null)
  .withMessage(`${field} must be a valid YYYY-MM-DD date.`);

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive whole number.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be from 1 to 100.').toInt(),
];

const bookingIdValidation = param('id').isMongoId().withMessage('Booking id is invalid.');

const createBookingValidation = [
  body('roomId').isMongoId().withMessage('roomId must be a valid room id.'),
  dateValidation('checkIn'),
  dateValidation('checkOut'),
  body('guests')
    .isInt({ min: 1, max: 20 }).withMessage('guests must be a whole number from 1 to 20.')
    .toInt(),
];

router.post(
  '/',
  authenticate,
  createBookingValidation,
  validateRequest,
  validateStayDates('body', {
    required: true,
    maxNights: 365,
    futureOnly: true,
    includeReservedNights: true,
  }),
  createBooking,
);

router.get('/my', authenticate, paginationValidation, validateRequest, getMyBookings);
router.get(
  '/',
  authenticate,
  requireRole('staff', 'admin'),
  [...paginationValidation, query('status').optional().isIn(bookingStatuses).withMessage('Choose a supported booking status.')],
  validateRequest,
  getAllBookings,
);

router.patch('/:id/cancel', authenticate, bookingIdValidation, validateRequest, cancelBooking);
router.patch(
  '/:id/check-in',
  authenticate,
  requireRole('staff', 'admin'),
  bookingIdValidation,
  validateRequest,
  checkInBooking,
);
router.patch(
  '/:id/check-out',
  authenticate,
  requireRole('staff', 'admin'),
  bookingIdValidation,
  validateRequest,
  checkOutBooking,
);

export default router;
