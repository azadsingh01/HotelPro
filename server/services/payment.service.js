import ApiError from '../utils/ApiError.js';
import Booking from '../models/bookingModel.js';

function publicPayment(booking) {
  return {
    booking: booking.id ?? booking._id.toString(),
    cardDetails: {
      cardholdername: booking.cardDetails?.cardholdername ?? '',
      last4: booking.cardDetails?.last4 ?? '',
      expmonthyear: booking.cardDetails?.expmonthyear ?? '',
      paymentStatus: booking.cardDetails?.paymentStatus ?? 'pending',
    },
    amount: booking.totalAmount,
  };
}

async function findOwnedBooking(bookingId, user) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (booking.userid.toString() !== user.id) throw new ApiError(403, 'You can only access payments for your own bookings.');
  return booking;
}

export async function startMockPaymentForBooking(bookingId, user, cardDetails) {
  let booking = await findOwnedBooking(bookingId, user);
  if (booking.status !== 'booked') throw new ApiError(409, 'Only a booked reservation can be paid.');
  if (booking.totalAmount <= 0) throw new ApiError(409, 'No payment is due for this booking.');
  const currentStatus = booking.cardDetails?.paymentStatus ?? 'pending';
  if (currentStatus === 'pending') return { payment: publicPayment(booking) };
  if (currentStatus === 'paid') throw new ApiError(409, 'This booking already has a paid payment record.');

  booking = await Booking.findOneAndUpdate(
    { _id: booking._id, userid: user._id, status: 'booked', 'cardDetails.paymentStatus': 'failed' },
    { $set: {
      'cardDetails.cardholdername': cardDetails.cardholdername,
      'cardDetails.last4': cardDetails.last4,
      'cardDetails.expmonthyear': cardDetails.expmonthyear,
      'cardDetails.paymentStatus': 'pending',
    } },
    { new: true, runValidators: true },
  );
  if (!booking) throw new ApiError(409, 'The booking changed before payment could start.');
  return {
    message: 'Mock payment started. Complete it to mark the booking paid.',
    payment: publicPayment(booking),
  };
}

export async function getPaymentForBooking(bookingId, user) {
  const booking = await findOwnedBooking(bookingId, user);
  return { payment: publicPayment(booking) };
}

export async function completeMockPaymentForBooking(bookingId, user) {
  const booking = await findOwnedBooking(bookingId, user);
  if (booking.status !== 'booked' || booking.cardDetails?.paymentStatus !== 'pending') {
    throw new ApiError(409, 'Only a pending mock payment for a booked reservation can be completed.');
  }
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, userid: user._id, status: 'booked', 'cardDetails.paymentStatus': 'pending' },
    { $set: { 'cardDetails.paymentStatus': 'paid' } },
    { new: true, runValidators: true },
  );
  if (!updated) throw new ApiError(409, 'The booking changed before payment could be completed.');
  return { message: 'Mock payment completed successfully.', payment: publicPayment(updated) };
}

export async function refundMockPaymentForBooking(bookingId, user) {
  const booking = await findOwnedBooking(bookingId, user);
  if (booking.status !== 'booked' || booking.cardDetails?.paymentStatus !== 'paid') {
    throw new ApiError(409, 'A payment can only be refunded before the guest checks in.');
  }
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, userid: user._id, status: 'booked', 'cardDetails.paymentStatus': 'paid' },
    { $set: { 'cardDetails.paymentStatus': 'failed' } },
    { new: true, runValidators: true },
  );
  if (!updated) throw new ApiError(409, 'The booking changed before the refund could be processed.');
  return { message: 'Mock payment marked failed. Cancel the booking to release its room units.', payment: publicPayment(updated) };
}
