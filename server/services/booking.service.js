import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import { roomHasAvailabilityExpression } from '../utils/dateOverlap.js';
import Booking from '../models/bookingModel.js';
import Room from '../models/roomModel.js';

function formatDate(date) { return date.toISOString().slice(0, 10); }

function referenceId(value) {
  if (typeof value?.toHexString === 'function') return value.toHexString();
  if (value && typeof value === 'object') return value.id ?? value._id?.toString();
  return value?.toString();
}

function toPublicBooking(booking) {
  const user = booking.userid && typeof booking.userid === 'object' && booking.userid.name
    ? { id: referenceId(booking.userid), name: booking.userid.name, email: booking.userid.email, phone: booking.userid.phone ?? booking.phone }
    : referenceId(booking.userid);
  const room = booking.roomid && typeof booking.roomid === 'object' && booking.roomid.roomNumber
    ? { id: referenceId(booking.roomid), roomNumber: booking.roomid.roomNumber, type: booking.roomid.type, rent: booking.roomid.rent }
    : referenceId(booking.roomid);
  const cardDetails = {
    cardholdername: booking.cardDetails?.cardholdername ?? '',
    last4: booking.cardDetails?.last4 ?? '',
    expmonthyear: booking.cardDetails?.expmonthyear ?? '',
    paymentStatus: booking.cardDetails?.paymentStatus ?? 'pending',
  };
  return {
    id: booking.id ?? booking._id.toString(),
    userid: user,
    roomid: room,
    type: booking.type,
    username: booking.username,
    phone: booking.phone,
    fromdate: formatDate(booking.fromdate),
    todate: formatDate(booking.todate),
    totaldays: booking.totaldays,
    guests: booking.guests,
    totalAmount: booking.totalAmount,
    status: booking.status,
    cardDetails,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

function populatedBooking(query) {
  return query.populate('userid', 'name email phone').populate('roomid', 'roomNumber type rent');
}

async function listBookings(criteria, page, limit) {
  const skip = (page - 1) * limit;
  const [bookings, total] = await Promise.all([
    populatedBooking(Booking.find(criteria).sort({ createdAt: -1 }).skip(skip).limit(limit)).lean(),
    Booking.countDocuments(criteria),
  ]);
  return {
    bookings: bookings.map(toPublicBooking),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function createBookingForUser(values, stayDates, user, cardDetails) {
  const { checkIn: fromdate, checkOut: todate, nights: totaldays } = stayDates;
  const room = await Room.findById(values.roomid);
  if (!room || !room.isActive) throw new ApiError(404, 'Room not found.');
  if (room.status !== 'available' || room.count < 1) throw new ApiError(409, 'This room is not currently bookable.');
  if ((values.guests ?? 1) > room.capacity) throw new ApiError(400, `This room accommodates up to ${room.capacity} guests.`);

  const bookingId = new mongoose.Types.ObjectId();
  const reservedRoom = await Room.findOneAndUpdate(
    { _id: room._id, isActive: true, status: 'available', ...roomHasAvailabilityExpression(fromdate, todate) },
    { $push: { currentBookings: { bookingId, fromdate, todate, status: 'booked', userid: user._id } } },
    { new: true },
  );
  if (!reservedRoom) throw new ApiError(409, 'No units of this room are available for those dates.');

  try {
    const totalAmount = Math.round(room.rent * totaldays * 100) / 100;
    await Booking.create({
      _id: bookingId,
      userid: user._id,
      roomid: room._id,
      type: room.type,
      username: user.name,
      phone: user.phone,
      fromdate,
      todate,
      totaldays,
      guests: values.guests ?? 1,
      totalAmount,
      status: 'booked',
      cardDetails: {
        cardholdername: cardDetails.cardholdername,
        last4: cardDetails.last4,
        expmonthyear: cardDetails.expmonthyear,
        paymentStatus: 'paid',
      },
    });
  } catch (error) {
    await Room.updateOne({ _id: room._id }, { $pull: { currentBookings: { bookingId } } });
    throw error;
  }

  const booking = await populatedBooking(Booking.findById(bookingId));
  return { message: 'Booking created successfully.', booking: toPublicBooking(booking) };
}

export async function listCustomerBookings(userid, page, limit) {
  return listBookings({ userid }, page, limit);
}

export async function listAdminBookings(filters, page, limit) {
  const criteria = filters.status ? { status: filters.status } : {};
  return listBookings(criteria, page, limit);
}

export async function cancelCustomerBooking(bookingId, user) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (booking.userid.toString() !== user.id) throw new ApiError(403, 'You can only cancel your own bookings.');
  if (booking.status === 'cancelled') throw new ApiError(409, 'This booking is already cancelled.');
  if (booking.status !== 'booked') throw new ApiError(409, 'Only a booking that has not checked in can be cancelled.');

  const originalPaymentStatus = booking.cardDetails?.paymentStatus ?? 'pending';
  const nextPaymentStatus = ['paid', 'pending'].includes(originalPaymentStatus) ? 'failed' : originalPaymentStatus;
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, userid: user._id, status: 'booked', 'cardDetails.paymentStatus': originalPaymentStatus },
    { $set: {
      status: 'cancelled',
      'cardDetails.paymentStatus': nextPaymentStatus,
    } },
    { new: true },
  );
  if (!updated) throw new ApiError(409, 'The booking changed before it could be cancelled.');

  try {
    const roomUpdate = await Room.updateOne(
      {
        _id: booking.roomid,
        currentBookings: { $elemMatch: { bookingId: booking._id, status: 'booked' } },
      },
      { $set: { 'currentBookings.$.status': 'cancelled' } },
    );
    if (roomUpdate.modifiedCount !== 1) {
      throw new ApiError(409, 'The room reservation could not be updated; the booking was left unchanged.');
    }
  } catch (error) {
    await Booking.updateOne(
      { _id: booking._id, userid: user._id, status: 'cancelled', 'cardDetails.paymentStatus': nextPaymentStatus },
      { $set: { status: 'booked', 'cardDetails.paymentStatus': originalPaymentStatus } },
    ).catch(() => {});
    throw error;
  }

  const populated = await populatedBooking(Booking.findById(updated._id));
  return { message: 'Booking cancelled successfully.', booking: toPublicBooking(populated) };
}

export async function checkInBookingById(bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (booking.status !== 'booked') throw new ApiError(409, 'Only a booked reservation can be checked in.');
  if (booking.cardDetails?.paymentStatus !== 'paid') throw new ApiError(409, 'Complete payment before checking in.');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (today < booking.fromdate || today >= booking.todate) {
    throw new ApiError(409, 'Check-in is allowed only between the scheduled check-in and check-out dates.');
  }
  const updated = await populatedBooking(Booking.findOneAndUpdate(
    { _id: booking._id, status: 'booked', 'cardDetails.paymentStatus': 'paid' },
    { $set: { status: 'checked-in' } },
    { new: true },
  ));
  if (!updated) throw new ApiError(409, 'The booking changed before check-in could be completed.');
  await Room.updateOne({ _id: booking.roomid, 'currentBookings.bookingId': booking._id }, { $set: { 'currentBookings.$.status': 'checked-in' } });
  return { message: 'Guest checked in successfully.', booking: toPublicBooking(updated) };
}

export async function checkOutBookingById(bookingId) {
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, status: 'checked-in' },
    { $set: { status: 'checked-out' } },
    { new: true },
  );
  if (!booking) {
    const exists = await Booking.exists({ _id: bookingId });
    if (!exists) throw new ApiError(404, 'Booking not found.');
    throw new ApiError(409, 'Only a checked-in guest can be checked out.');
  }
  await Room.updateOne({ _id: booking.roomid, 'currentBookings.bookingId': booking._id }, { $set: { 'currentBookings.$.status': 'checked-out' } });
  await booking.populate('userid', 'name email phone');
  await booking.populate('roomid', 'roomNumber type rent');
  return { message: 'Guest checked out successfully.', booking: toPublicBooking(booking) };
}
