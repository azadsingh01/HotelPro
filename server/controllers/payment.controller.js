import { randomUUID } from 'node:crypto';
import ApiError from '../utils/ApiError.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';

function toPublicPayment(payment) {
  return {
    id: payment.id ?? payment._id.toString(),
    booking: payment.booking.toString(),
    guest: payment.guest.toString(),
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    status: payment.status,
    transactionId: payment.transactionId,
    processedAt: payment.processedAt ?? null,
    paidAt: payment.paidAt ?? null,
    refundedAt: payment.refundedAt ?? null,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

function isManager(user) {
  return ['staff', 'admin'].includes(user.role);
}

function assertPaymentAccess(payment, user) {
  if (!isManager(user) && payment.guest.toString() !== user.id) {
    throw new ApiError(403, 'You can only access payments for your own bookings.');
  }
}

async function findBookingForUser(bookingId, user) {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new ApiError(404, 'Booking not found.');
  }

  if (!isManager(user) && booking.guest.toString() !== user.id) {
    throw new ApiError(403, 'You can only access payments for your own bookings.');
  }

  return booking;
}

/** Start a mock payment. Repeating this request returns its existing pending record. */
export async function createPendingPayment(request, response) {
  let booking = await findBookingForUser(request.params.bookingId, request.user);

  if (booking.status !== 'booked') {
    throw new ApiError(409, 'Only a booked reservation can be paid.');
  }

  if (booking.totalAmount <= 0) {
    throw new ApiError(409, 'No payment is due for this booking.');
  }

  const existingPayment = await Payment.findOne({ booking: booking._id });

  if (existingPayment) {
    if (existingPayment.status === 'pending' && booking.paymentStatus === 'pending') {
      return response.json({ payment: toPublicPayment(existingPayment) });
    }

    throw new ApiError(409, 'This booking already has a payment record.');
  }

  if (!['unpaid', 'pending'].includes(booking.paymentStatus)) {
    throw new ApiError(409, 'This booking is already paid or refunded.');
  }

  if (booking.paymentStatus === 'unpaid') {
    booking = await Booking.findOneAndUpdate(
      { _id: booking._id, status: 'booked', paymentStatus: 'unpaid' },
      { $set: { paymentStatus: 'pending' } },
      { new: true },
    );

    if (!booking) {
      const currentBooking = await findBookingForUser(request.params.bookingId, request.user);
      const currentPayment = await Payment.findOne({ booking: currentBooking._id });

      if (currentPayment?.status === 'pending') {
        return response.json({ payment: toPublicPayment(currentPayment) });
      }

      throw new ApiError(409, 'The booking changed before payment could start.');
    }
  }

  try {
    const payment = await Payment.create({
      booking: booking._id,
      guest: booking.guest,
      amount: booking.totalAmount,
      currency: 'USD',
      method: 'mock',
      status: 'pending',
      transactionId: `mock_${randomUUID()}`,
    });

    return response.status(201).json({
      message: 'Mock payment started. Complete it to mark the booking paid.',
      payment: toPublicPayment(payment),
    });
  } catch (error) {
    if (error.code === 11000) {
      const payment = await Payment.findOne({ booking: booking._id });
      if (payment?.status === 'pending') {
        return response.json({ payment: toPublicPayment(payment) });
      }
    } else {
      await Booking.updateOne(
        { _id: booking._id, status: 'booked', paymentStatus: 'pending' },
        { $set: { paymentStatus: 'unpaid' } },
      );
    }

    throw error;
  }
}

/** Read the payment record associated with a booking. */
export async function getBookingPayments(request, response) {
  const booking = await findBookingForUser(request.params.bookingId, request.user);
  const payments = await Payment.find({ booking: booking._id }).sort({ createdAt: -1 });

  response.json({ payments: payments.map(toPublicPayment) });
}

/** Simulate the payment provider confirming that a pending mock payment is paid. */
export async function completeMockPayment(request, response) {
  const payment = await Payment.findById(request.params.paymentId);

  if (!payment) {
    throw new ApiError(404, 'Payment not found.');
  }

  assertPaymentAccess(payment, request.user);

  if (payment.status !== 'pending') {
    throw new ApiError(409, 'Only a pending payment can be completed.');
  }

  const booking = await Booking.findById(payment.booking);

  if (!booking || booking.status !== 'booked' || booking.paymentStatus !== 'pending') {
    throw new ApiError(409, 'The booking is no longer awaiting this payment.');
  }

  const paidBooking = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'booked', paymentStatus: 'pending' },
    { $set: { paymentStatus: 'paid' } },
    { new: true },
  );

  if (!paidBooking) {
    throw new ApiError(409, 'The booking changed before payment could be completed.');
  }

  let paidPayment;
  const paidAt = new Date();

  try {
    paidPayment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'pending' },
      { $set: { status: 'paid', processedAt: paidAt, paidAt } },
      { new: true },
    );
  } catch (error) {
    await Booking.updateOne(
      { _id: booking._id, status: 'booked', paymentStatus: 'paid' },
      { $set: { paymentStatus: 'pending' } },
    );
    throw error;
  }

  if (!paidPayment) {
    await Booking.updateOne(
      { _id: booking._id, status: 'booked', paymentStatus: 'paid' },
      { $set: { paymentStatus: 'pending' } },
    );
    throw new ApiError(409, 'The payment changed before it could be completed.');
  }

  response.json({
    message: 'Mock payment completed successfully.',
    payment: toPublicPayment(paidPayment),
    bookingPaymentStatus: paidBooking.paymentStatus,
  });
}

/** Refund a paid mock payment before check-in. The guest can cancel afterward. */
export async function refundMockPayment(request, response) {
  const payment = await Payment.findById(request.params.paymentId);

  if (!payment) {
    throw new ApiError(404, 'Payment not found.');
  }

  assertPaymentAccess(payment, request.user);

  if (payment.status !== 'paid') {
    throw new ApiError(409, 'Only a paid mock payment can be refunded.');
  }

  const booking = await Booking.findById(payment.booking);

  if (!booking || booking.status !== 'booked' || booking.paymentStatus !== 'paid') {
    throw new ApiError(409, 'A payment can only be refunded before the guest checks in.');
  }

  const refundedBooking = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'booked', paymentStatus: 'paid' },
    { $set: { paymentStatus: 'refunded' } },
    { new: true },
  );

  if (!refundedBooking) {
    throw new ApiError(409, 'The booking changed before the refund could be processed.');
  }

  let refundedPayment;
  const refundedAt = new Date();

  try {
    refundedPayment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'paid' },
      { $set: { status: 'refunded', processedAt: refundedAt, refundedAt } },
      { new: true },
    );
  } catch (error) {
    await Booking.updateOne(
      { _id: booking._id, status: 'booked', paymentStatus: 'refunded' },
      { $set: { paymentStatus: 'paid' } },
    );
    throw error;
  }

  if (!refundedPayment) {
    await Booking.updateOne(
      { _id: booking._id, status: 'booked', paymentStatus: 'refunded' },
      { $set: { paymentStatus: 'paid' } },
    );
    throw new ApiError(409, 'The payment changed before it could be refunded.');
  }

  response.json({
    message: 'Mock payment refunded successfully. Cancel the booking to release its room nights.',
    payment: toPublicPayment(refundedPayment),
    bookingPaymentStatus: refundedBooking.paymentStatus,
  });
}
