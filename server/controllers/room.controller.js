import { matchedData } from 'express-validator';
import ApiError from '../utils/ApiError.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';

const createRoomFields = [
  'roomNumber',
  'type',
  'description',
  'capacity',
  'pricePerNight',
  'amenities',
  'status',
];
const updateRoomFields = [...createRoomFields, 'isActive'];

function toPublicRoom(room) {
  return {
    id: room.id ?? room._id.toString(),
    roomNumber: room.roomNumber,
    type: room.type,
    description: room.description,
    capacity: room.capacity,
    pricePerNight: room.pricePerNight,
    amenities: room.amenities,
    status: room.status,
    isActive: room.isActive,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

function selectRoomFields(values, allowedFields = createRoomFields) {
  return Object.fromEntries(
    Object.entries(values).filter(([field]) => allowedFields.includes(field)),
  );
}

/** Return active rooms, optionally filtered by rate, capacity, type, and dates. */
export async function searchRooms(request, response) {
  const filters = matchedData(request, { locations: ['query'] });
  const criteria = { isActive: true, status: 'available' };

  if (filters.type) criteria.type = filters.type;
  if (filters.capacity !== undefined) criteria.capacity = { $gte: filters.capacity };
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    criteria.pricePerNight = {};
    if (filters.minPrice !== undefined) criteria.pricePerNight.$gte = filters.minPrice;
    if (filters.maxPrice !== undefined) criteria.pricePerNight.$lte = filters.maxPrice;
  }

  let rooms = await Room.find(criteria).sort({ roomNumber: 1 });

  if (request.stayDates) {
    const busyRoomIds = await Booking.distinct('room', {
      room: { $in: rooms.map((room) => room._id) },
      status: { $in: ['booked', 'checked_in'] },
      checkIn: { $lt: request.stayDates.checkOut },
      checkOut: { $gt: request.stayDates.checkIn },
    });
    const busyRoomIdSet = new Set(busyRoomIds.map((id) => id.toString()));
    rooms = rooms.filter((room) => !busyRoomIdSet.has(room.id));
  }

  response.json({ rooms: rooms.map(toPublicRoom), count: rooms.length });
}

/** Return the complete inventory, including maintenance and deactivated rooms. */
export async function getManagedRooms(_request, response) {
  const rooms = await Room.find().sort({ roomNumber: 1 });

  response.json({ rooms: rooms.map(toPublicRoom), count: rooms.length });
}

/** Return one active room by its MongoDB id. */
export async function getRoom(request, response) {
  const room = await Room.findOne({ _id: request.params.id, isActive: true });

  if (!room) {
    throw new ApiError(404, 'Room not found.');
  }

  response.json({ room: toPublicRoom(room) });
}

/** Add a room to inventory. */
export async function createRoom(request, response) {
  const room = await Room.create(selectRoomFields(request.body));

  response.status(201).json({
    message: 'Room created successfully.',
    room: toPublicRoom(room),
  });
}

/** Update only the room properties that admins are allowed to change. */
export async function updateRoom(request, response) {
  const updates = selectRoomFields(request.body, updateRoomFields);

  const room = await Room.findOneAndUpdate(
    { _id: request.params.id },
    { $set: updates },
    { new: true, runValidators: true },
  );

  if (!room) {
    throw new ApiError(404, 'Room not found.');
  }

  response.json({ message: 'Room updated successfully.', room: toPublicRoom(room) });
}

/** Soft-delete a room so that old bookings keep their room reference. */
export async function deleteRoom(request, response) {
  const room = await Room.findOneAndUpdate(
    { _id: request.params.id, isActive: true },
    { $set: { isActive: false } },
    { new: true },
  );

  if (!room) {
    throw new ApiError(404, 'Room not found.');
  }

  response.json({ message: 'Room removed from active inventory.', room: toPublicRoom(room) });
}
