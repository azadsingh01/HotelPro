import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createRoom,
  deleteRoom,
  getManagedRooms,
  getRoom,
  searchRooms,
  updateRoom,
} from '../controllers/room.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validateRequest } from '../utils/validateRequest.js';
import { parseDateOnly, requireOneField, validatePriceRange, validateStayDates } from '../utils/dateOnly.js';

const router = Router();
const roomTypes = ['single', 'double', 'twin', 'suite', 'family'];
const roomStatuses = ['available', 'maintenance', 'out_of_service'];
const editableFields = ['roomNumber', 'type', 'description', 'capacity', 'pricePerNight', 'amenities', 'status', 'isActive'];

const roomNumberValidation = (required = false) => {
  const validation = body('roomNumber');
  if (required) {
    validation.exists().withMessage('Room number is required.').bail();
  } else {
    validation.optional();
  }
  return validation
    .isString().withMessage('Room number must be text.')
    .bail()
    .trim()
    .isLength({ min: 1, max: 20 }).withMessage('Room number must be 1 to 20 characters.');
};

const roomTypeValidation = (required = false) => {
  const validation = body('type');
  if (!required) validation.optional();
  return validation.isIn(roomTypes).withMessage('Choose a supported room type.');
};

const descriptionValidation = body('description')
  .optional()
  .isString().withMessage('Description must be text.')
  .bail()
  .trim()
  .isLength({ max: 1000 }).withMessage('Description must be 1000 characters or fewer.');

const capacityValidation = (required = false) => {
  const validation = body('capacity');
  if (!required) validation.optional();
  return validation.isInt({ min: 1, max: 20 }).withMessage('Capacity must be a whole number from 1 to 20.').toInt();
};

const priceValidation = (required = false) => {
  const validation = body('pricePerNight');
  if (!required) validation.optional();
  return validation.isFloat({ min: 0 }).withMessage('Price per night must be a non-negative number.').toFloat();
};

const amenitiesValidation = [
  body('amenities').optional().isArray({ max: 30 }).withMessage('Amenities must be an array of up to 30 items.'),
  body('amenities.*')
    .isString().withMessage('Each amenity must be text.')
    .bail()
    .trim()
    .isLength({ min: 1, max: 60 }).withMessage('Each amenity must be 1 to 60 characters.'),
];

const statusValidation = body('status')
  .optional()
  .isIn(roomStatuses).withMessage('Choose a supported room status.');

const activeValidation = body('isActive')
  .optional()
  .isBoolean().withMessage('isActive must be true or false.')
  .toBoolean();

const createRoomValidation = [
  roomNumberValidation(true),
  roomTypeValidation(true),
  descriptionValidation,
  capacityValidation(true),
  priceValidation(true),
  ...amenitiesValidation,
  statusValidation,
];

const updateRoomValidation = [
  roomNumberValidation(),
  roomTypeValidation(),
  descriptionValidation,
  capacityValidation(),
  priceValidation(),
  ...amenitiesValidation,
  statusValidation,
  activeValidation,
];

const searchValidation = [
  query('type').optional().isIn(roomTypes).withMessage('Choose a supported room type.'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice must be non-negative.').toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice must be non-negative.').toFloat(),
  query('capacity').optional().isInt({ min: 1, max: 20 }).withMessage('capacity must be a whole number from 1 to 20.').toInt(),
  query('checkIn')
    .optional()
    .custom((value) => parseDateOnly(value) !== null).withMessage('checkIn must be a valid YYYY-MM-DD date.'),
  query('checkOut')
    .optional()
    .custom((value) => parseDateOnly(value) !== null).withMessage('checkOut must be a valid YYYY-MM-DD date.'),
];

router.get('/', searchValidation, validateRequest, validatePriceRange, validateStayDates('query', { futureOnly: true }), searchRooms);
router.post('/', authenticate, requireRole('admin'), createRoomValidation, validateRequest, createRoom);
router.get('/manage', authenticate, requireRole('admin'), getManagedRooms);
router.get('/:id', param('id').isMongoId().withMessage('Room id is invalid.'), validateRequest, getRoom);
router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  param('id').isMongoId().withMessage('Room id is invalid.'),
  updateRoomValidation,
  validateRequest,
  requireOneField(editableFields),
  updateRoom,
);
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  param('id').isMongoId().withMessage('Room id is invalid.'),
  validateRequest,
  deleteRoom,
);

export default router;
