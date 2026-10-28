import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  checkInBooking,
  checkOutBooking,
  getAllBookings,
} from '../controllers/booking.controller.js';
import { getOverviewStats, getTodayStats } from '../controllers/adminStats.controller.js';
import { getAllUsers } from '../controllers/adminUsers.controller.js';
import {
  createRoom,
  deleteRoom,
  getManagedRooms,
  getRoom,
  updateRoom,
} from '../controllers/room.controller.js';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/role.js';
import { collectRoomPhotos, uploadRoomPhotos } from '../middleware/upload.js';
import { requireOneField } from '../utils/dateOnly.js';
import { validateRequest } from '../utils/validateRequest.js';

const router = Router();
const roomTypes = ['single', 'double', 'twin', 'deluxe', 'suite', 'family'];
const roomStatuses = ['available', 'maintenance', 'out_of_service'];
const bookingStatuses = ['booked', 'cancelled', 'checked-in', 'checked-out'];
const editableFields = ['roomNumber', 'type', 'description', 'photos', 'capacity', 'rent', 'count', 'amenities', 'status', 'isActive'];
const idValidation = param('id').isMongoId().withMessage('Id is invalid.');
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive whole number.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be from 1 to 100.').toInt(),
];

router.use(authenticate, isAdmin);

const roomNumberValidation = (required = false) => {
  const field = body('roomNumber');
  if (required) field.exists().withMessage('Room number is required.').bail();
  else field.optional();
  return field.isInt({ min: 1, max: 100000 }).withMessage('Room number must be a positive whole number.').toInt();
};
const roomTypeValidation = (required = false) => {
  const field = body('type');
  if (!required) field.optional();
  return field.isIn(roomTypes).withMessage('Choose a supported room type.');
};
const descriptionValidation = (required = false) => {
  const field = body('description');
  if (!required) field.optional();
  return field.isString().withMessage('Description must be text.').bail().trim().isLength({ min: 1, max: 1000 }).withMessage('Description must be between 1 and 1000 characters.');
};
const photosValidation = [
  body('photos').optional().isArray({ max: 20 }).withMessage('photos must be an array of up to 20 URLs.'),
  body('photos.*').optional().isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Each photo must be an HTTP(S) URL.'),
];
const capacityValidation = (required = false) => {
  const field = body('capacity');
  if (!required) field.optional();
  return field.isInt({ min: 1, max: 20 }).withMessage('capacity must be a whole number from 1 to 20.').toInt();
};
const rentValidation = (required = false) => {
  const field = body('rent');
  if (!required) field.optional();
  return field.isFloat({ min: 0, max: 1000000 }).withMessage('rent must be a non-negative amount.').toFloat();
};
const countValidation = (required = false) => {
  const field = body('count');
  if (!required) field.optional();
  return field.isInt({ min: 0, max: 10000 }).withMessage('count must be a whole number from 0 to 10000.').toInt();
};
const amenitiesValidation = [
  body('amenities').optional().isArray({ max: 30 }).withMessage('amenities must be an array of up to 30 items.'),
  body('amenities.*').optional().isString().withMessage('Each amenity must be text.').bail().trim().isLength({ min: 1, max: 60 }).withMessage('Each amenity must be 1 to 60 characters.'),
];
const roomStatusValidation = body('status').optional().isIn(roomStatuses).withMessage('Choose a supported room status.');
const activeValidation = body('isActive').optional().isBoolean().withMessage('isActive must be true or false.').toBoolean();
const createRoomValidation = [roomNumberValidation(true), roomTypeValidation(true), descriptionValidation(true), ...photosValidation, capacityValidation(), rentValidation(true), countValidation(true), ...amenitiesValidation, roomStatusValidation];
const updateRoomValidation = [roomNumberValidation(), roomTypeValidation(), descriptionValidation(), ...photosValidation, capacityValidation(), rentValidation(), countValidation(), ...amenitiesValidation, roomStatusValidation, activeValidation];

router.get('/stats/overview', getOverviewStats);
router.get('/stats/today', getTodayStats);
router.get('/users', paginationValidation, validateRequest, getAllUsers);
router.get('/rooms', getManagedRooms);
router.post('/rooms', uploadRoomPhotos.array('photos', 5), collectRoomPhotos, createRoomValidation, validateRequest, createRoom);
router.get('/rooms/:id', idValidation, validateRequest, getRoom);
router.put('/rooms/:id', uploadRoomPhotos.array('photos', 5), collectRoomPhotos, idValidation, updateRoomValidation, validateRequest, requireOneField(editableFields), updateRoom);
router.patch('/rooms/:id', uploadRoomPhotos.array('photos', 5), collectRoomPhotos, idValidation, updateRoomValidation, validateRequest, requireOneField(editableFields), updateRoom);
router.delete('/rooms/:id', idValidation, validateRequest, deleteRoom);
router.get(
  '/bookings',
  [...paginationValidation, query('status').optional().isIn(bookingStatuses).withMessage('Choose a supported booking status.')],
  validateRequest,
  getAllBookings,
);
router.patch('/bookings/:id/check-in', idValidation, validateRequest, checkInBooking);
router.patch('/bookings/:id/check-out', idValidation, validateRequest, checkOutBooking);

export default router;
