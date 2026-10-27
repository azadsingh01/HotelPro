import { matchedData } from 'express-validator';
import ApiError from '../utils/ApiError.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';

const activeBookingStatuses = ['booked', 'checked_in'];

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function toPublicBooking(booking) {
  const guestIsPopulated = Boolean(booking.guest?.name);
  const roomIsPopulated = Boolean(booking.room?.roomNumber);

  return {
    id: booking.id ?? booking._id.toString(),
    guest: guestIsPopulated
      ? { id: booking.guest.id, name: booking.guest.name, email: booking.guest.email }
      : booking.guest.toString(),
    room: roomIsPopulated
      ? {
        id: booking.room.id,
        roomNumber: booking.room.roomNumber,
        type: booking.room.type,
        pricePerNight: booking.room.pricePerNight,
      }
      : booking.room.toString(),
    checkIn: formatDate(booking.checkIn),
    checkOut: formatDate(booking.checkOut),
    guests: booking.guests,
    totalAmount: booking.totalAmount,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

function populateBooking(query) {
  return query
    .populate('guest', 'name email')
    .populate('room', 'roomNumber type pricePerNight');
}

function getPagination(request) {
  const filters = matchedData(request, { locations: ['query'] });
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  return { page, limit, skip: (page - 1) * limit };
}

async function sendBookingList(request, response, criteria) {
  const { page, limit, skip } = getPagination(request);
  const [bookings, total] = await Promise.all([
    populateBooking(Booking.find(criteria).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Booking.countDocuments(criteria),
  ]);

  response.json({
    bookings: bookings.map(toPublicBooking),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

/** Create a booking using the room's current nightly rate. */
export async function createBooking(request, response) {
  const { roomId, guests } = request.body;
  const { checkIn, checkOut, nights, reservedNights } = request.stayDates;
  const room = await Room.findById(roomId);

  if (!room || !room.isActive) {
    throw new ApiError(404, 'Room not found.');
  }

  if (room.status !== 'available') {
    throw new ApiError(409, 'This room is not currently bookable.');
  }

  if (guests > room.capacity) {
    throw new ApiError(400, `This room accommodates up to ${room.capacity} guests.`);
  }

  const dateOverlap = await Booking.exists({
    room: room._id,
    status: { $in: activeBookingStatuses },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  });

  if (dateOverlap) {
    throw new ApiError(409, 'This room is already booked for one or more of those nights.');
  }

  const totalAmount = Math.round(room.pricePerNight * nights * 100) / 100;
  let createdBooking;

  try {
    createdBooking = await Booking.create({
      guest: request.user._id,
      room: room._id,
      checkIn,
      checkOut,
      guests,
      totalAmount,
      reservedNights,
    });
  } catch (error) {
    // The unique room/night index rejects a conflicting request even if both
    // requests passed the overlap read at nearly the same time.
    if (error.code === 11000) {
      throw new ApiError(409, 'This room is already booked for one or more of those nights.');
    }

    throw error;
  }

  const booking = await populateBooking(Booking.findById(createdBooking._id));

  response.status(201).json({
    message: 'Booking created successfully.',
    booking: toPublicBooking(booking),
  });
}

/** List bookings belonging to the authenticated account. */
export async function getMyBookings(request, response) {
  await sendBookingList(request, response, { guest: request.user._id });
}

/** List all bookings for staff and administrators. */
export async function getAllBookings(request, response) {
  const filters = matchedData(request, { locations: ['query'] });
  const criteria = {};

  if (filters.status) criteria.status = filters.status;

  await sendBookingList(request, response, criteria);
}

/** Cancel an uncompleted booking after any payment has been resolved. */
export async function cancelBooking(request, response) {
  const booking = await Booking.findById(request.params.id).select('guest status paymentStatus');

  if (!booking) {
    throw new ApiError(404, 'Booking not found.');
  }

  const canManageAnyBooking = ['staff', 'admin'].includes(request.user.role);
  const isOwner = booking.guest.toString() === request.user.id;

  if (!canManageAnyBooking && !isOwner) {
    throw new ApiError(403, 'You can only cancel your own bookings.');
  }

  if (booking.status !== 'booked') {
    throw new ApiError(409, 'Only a booking that has not checked in can be cancelled.');
  }

  if (['pending', 'paid'].includes(booking.paymentStatus)) {
    throw new ApiError(409, 'Resolve the payment before cancelling this booking. Refund a paid payment first.');
  }

  const cancelledBooking = await populateBooking(Booking.findOneAndUpdate(
    { _id: booking._id, status: 'booked', paymentStatus: booking.paymentStatus },
    { $set: { status: 'cancelled', occupiesRoom: false } },
    { new: true },
  ));

  if (!cancelledBooking) {
    throw new ApiError(409, 'The booking changed before it could be cancelled.');
  }

  response.json({ message: 'Booking cancelled successfully.', booking: toPublicBooking(cancelledBooking) });
}

/** Mark a booking as checked in on its scheduled arrival date. */
export async function checkInBooking(request, response) {
  const booking = await Booking.findById(request.params.id);

  if (!booking) {
    throw new ApiError(404, 'Booking not found.');
  }

  if (booking.status !== 'booked') {
    throw new ApiError(409, 'Only a booked reservation can be checked in.');
  }

  if (booking.paymentStatus !== 'paid') {
    throw new ApiError(409, 'Complete payment before checking in.');
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (today < booking.checkIn || today >= booking.checkOut) {
    throw new ApiError(409, 'Check-in is allowed only between the scheduled check-in and check-out dates.');
  }

  const checkedInBooking = await populateBooking(Booking.findOneAndUpdate(
    { _id: booking._id, status: 'booked', paymentStatus: 'paid' },
    { $set: { status: 'checked_in' } },
    { new: true },
  ));

  if (!checkedInBooking) {
    throw new ApiError(409, 'The booking changed before check-in could be completed.');
  }

  response.json({ message: 'Guest checked in successfully.', booking: toPublicBooking(checkedInBooking) });
}

/** Mark an in-house booking as checked out and release its room nights. */
export async function checkOutBooking(request, response) {
  const checkedOutBooking = await populateBooking(Booking.findOneAndUpdate(
    { _id: request.params.id, status: 'checked_in' },
    { $set: { status: 'checked_out', occupiesRoom: false } },
    { new: true },
  ));

  if (!checkedOutBooking) {
    const bookingExists = await Booking.exists({ _id: request.params.id });

    if (!bookingExists) {
      throw new ApiError(404, 'Booking not found.');
    }

    throw new ApiError(409, 'Only a checked-in guest can be checked out.');
  }

  response.json({ message: 'Guest checked out successfully.', booking: toPublicBooking(checkedOutBooking) });
}
