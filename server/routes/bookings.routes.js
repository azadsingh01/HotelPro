import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { cancelBooking, createBooking, getMyBookings } from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { parseDateOnly, validateStayDates } from '../utils/dateOnly.js';
import { validateRequest } from '../utils/validateRequest.js';

const router = Router();
const isLuhnValid = (value) => {
  let sum = 0;
  let doubleDigit = false;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (doubleDigit) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2;
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
};

function isFutureExpiration(value) {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const now = new Date();
  return year > now.getUTCFullYear() || (year === now.getUTCFullYear() && month >= now.getUTCMonth() + 1);
}

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive whole number.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be from 1 to 100.').toInt(),
];
const bookingValidation = [
  body('roomid').isMongoId().withMessage('roomid must be a valid room id.'),
  body('fromdate').isString().withMessage('fromdate must be a date string.').bail().custom((value) => parseDateOnly(value) !== null).withMessage('fromdate must be a valid YYYY-MM-DD date.'),
  body('todate').isString().withMessage('todate must be a date string.').bail().custom((value) => parseDateOnly(value) !== null).withMessage('todate must be a valid YYYY-MM-DD date.'),
  body('guests').optional().isInt({ min: 1, max: 20 }).withMessage('guests must be a whole number from 1 to 20.').toInt(),
  body('cardDetails.cardholdername').isString().withMessage('Cardholder name must be text.').bail().trim().isLength({ min: 2, max: 80 }).withMessage('Cardholder name must be between 2 and 80 characters.'),
  body('cardDetails.cardNumber').isString().withMessage('Card number must be text.').bail().customSanitizer((value) => value.replace(/[\s-]/g, '')).custom((value) => /^\d{13,19}$/.test(value) && isLuhnValid(value)).withMessage('Enter a valid card number.').customSanitizer((value) => value.slice(-4)),
  body('cardDetails.expmonthyear').isString().withMessage('Expiration must use MM/YY.').bail().trim().custom(isFutureExpiration).withMessage('Card expiration must be a valid future month in MM/YY format.'),
  body('cardDetails.cvv').isString().withMessage('CVV must be text.').bail().isLength({ min: 3, max: 4 }).withMessage('CVV must have 3 or 4 digits.').bail().isNumeric().withMessage('CVV must contain digits only.'),
];
const cancelBodyValidation = body('bookingId').isMongoId().withMessage('Booking id is invalid.');

router.use(authenticate, requireRole('Ordinary'));
router.post('/', bookingValidation, validateRequest, validateStayDates('body', { required: true, maxNights: 365, futureOnly: true }), (request, _response, next) => {
  request.validatedPayment = {
    cardholdername: request.body.cardDetails.cardholdername.trim(),
    last4: request.body.cardDetails.cardNumber,
    expmonthyear: request.body.cardDetails.expmonthyear.trim(),
  };
  // Discard PAN and CVV immediately after validation. Neither reaches a controller or model.
  delete request.body.cardDetails.cardNumber;
  delete request.body.cardDetails.cvv;
  next();
}, createBooking);
router.get('/my', paginationValidation, validateRequest, getMyBookings);
router.post('/cancel', cancelBodyValidation, validateRequest, cancelBooking);

// Compatibility aliases for existing HotelPro clients.
router.get('/', paginationValidation, validateRequest, getMyBookings);
router.patch('/:id/cancel', param('id').isMongoId().withMessage('Booking id is invalid.'), validateRequest, cancelBooking);

export default router;
