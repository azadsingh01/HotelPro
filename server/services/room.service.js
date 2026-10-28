import ApiError from '../utils/ApiError.js';
import { ACTIVE_BOOKING_STATUSES, countActiveOverlaps } from '../utils/dateOverlap.js';
import Room from '../models/roomModel.js';

const roomFields = ['roomNumber', 'type', 'description', 'photos', 'capacity', 'rent', 'count', 'amenities', 'status'];

function toPublicRoom(room, availableCount) {
  const result = {
    id: room.id ?? room._id.toString(),
    roomNumber: room.roomNumber,
    type: room.type,
    description: room.description,
    photos: room.photos ?? [],
    capacity: room.capacity,
    rent: room.rent,
    count: room.count,
    amenities: room.amenities ?? [],
    status: room.status,
    isActive: room.isActive,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
  if (availableCount !== undefined) result.availableCount = availableCount;
  return result;
}

function getMaximumConcurrentBookings(bookings = []) {
  const changes = [];
  for (const booking of bookings) {
    if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) continue;
    changes.push([booking.fromdate.getTime(), 1], [booking.todate.getTime(), -1]);
  }
  changes.sort(([leftDate, leftChange], [rightDate, rightChange]) => leftDate - rightDate || leftChange - rightChange);
  let current = 0;
  let maximum = 0;
  for (const [, change] of changes) {
    current += change;
    maximum = Math.max(maximum, current);
  }
  return maximum;
}

export async function searchAvailableRooms(filters, stayDates) {
  const criteria = { isActive: true, status: 'available', count: { $gt: 0 } };
  if (filters.type) criteria.type = filters.type;
  if (filters.capacity !== undefined) criteria.capacity = { $gte: filters.capacity };
  if (filters.minRent !== undefined || filters.maxRent !== undefined) {
    criteria.rent = {};
    if (filters.minRent !== undefined) criteria.rent.$gte = filters.minRent;
    if (filters.maxRent !== undefined) criteria.rent.$lte = filters.maxRent;
  }
  const rooms = await Room.find(criteria).sort({ roomNumber: 1 }).lean();
  const availableRooms = stayDates
    ? rooms.map((room) => ({ room, availableCount: Math.max(0, room.count - countActiveOverlaps(room.currentBookings, stayDates.checkIn, stayDates.checkOut)) }))
      .filter(({ availableCount }) => availableCount > 0)
    : rooms.map((room) => ({ room, availableCount: room.count }));
  return { rooms: availableRooms.map(({ room, availableCount }) => toPublicRoom(room, availableCount)), count: availableRooms.length };
}

export async function listManagedRooms() {
  const rooms = await Room.find().sort({ roomNumber: 1 }).lean();
  return { rooms: rooms.map((room) => toPublicRoom(room)), count: rooms.length };
}

export async function getActiveRoom(id, stayDates) {
  const room = await Room.findOne({ _id: id, isActive: true }).lean();
  if (!room) throw new ApiError(404, 'Room not found.');
  const availableCount = stayDates
    ? Math.max(0, room.count - countActiveOverlaps(room.currentBookings, stayDates.checkIn, stayDates.checkOut))
    : room.count;
  return { room: toPublicRoom(room, availableCount) };
}

export async function createRoomRecord(values) {
  const fields = Object.fromEntries(Object.entries(values).filter(([key]) => roomFields.includes(key)));
  const room = new Room(fields);
  await room.save();
  return { message: 'Room created successfully.', room: toPublicRoom(room) };
}

export async function updateRoomRecord(id, values) {
  const updates = Object.fromEntries(Object.entries(values).filter(([key]) => [...roomFields, 'isActive'].includes(key)));
  const existing = await Room.findById(id);
  if (!existing) throw new ApiError(404, 'Room not found.');
  if (updates.count !== undefined && updates.count < getMaximumConcurrentBookings(existing.currentBookings)) {
    throw new ApiError(409, 'Count cannot be reduced below units already booked for overlapping dates.');
  }
  const room = await Room.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
  if (!room) throw new ApiError(404, 'Room not found.');
  return { message: 'Room updated successfully.', room: toPublicRoom(room) };
}

export async function deleteRoomRecord(id) {
  const activeStatuses = ['booked', 'checked-in'];
  const room = await Room.findOneAndDelete({
    _id: id,
    currentBookings: { $not: { $elemMatch: { status: { $in: activeStatuses } } } },
  });
  if (!room && !(await Room.exists({ _id: id }))) {
    throw new ApiError(404, 'Room not found.');
  }
  if (!room) {
    throw new ApiError(409, 'This room cannot be deleted while it has active bookings.');
  }
  return { message: 'Room deleted successfully.', room: toPublicRoom(room) };
}
