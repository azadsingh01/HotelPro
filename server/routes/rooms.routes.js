import { Router } from 'express';
import { param, query } from 'express-validator';
import { getRoom, searchRooms } from '../controllers/room.controller.js';
import { parseDateOnly, validatePriceRange, validateStayDates } from '../utils/dateOnly.js';
import { validateRequest } from '../utils/validateRequest.js';

const router = Router();
const roomTypes = ['single', 'double', 'twin', 'deluxe', 'suite', 'family'];
const roomSearchValidation = [
  query('type').optional().isIn(roomTypes).withMessage('Choose a supported room type.'),
  query('capacity').optional().isInt({ min: 1, max: 20 }).withMessage('capacity must be from 1 to 20.').toInt(),
  query('minRent').optional().isFloat({ min: 0 }).withMessage('minRent must be non-negative.').toFloat(),
  query('maxRent').optional().isFloat({ min: 0 }).withMessage('maxRent must be non-negative.').toFloat(),
  query('fromdate').optional().custom((value) => parseDateOnly(value) !== null).withMessage('fromdate must be a valid YYYY-MM-DD date.'),
  query('todate').optional().custom((value) => parseDateOnly(value) !== null).withMessage('todate must be a valid YYYY-MM-DD date.'),
];

router.get('/', roomSearchValidation, validateRequest, validatePriceRange, validateStayDates('query', { futureOnly: true }), searchRooms);
router.get('/:id', param('id').isMongoId().withMessage('Id is invalid.'), validateRequest, validateStayDates('query', { futureOnly: true }), getRoom);

export default router;
