import {
  completeMockPaymentForBooking,
  getPaymentForBooking,
  refundMockPaymentForBooking,
  startMockPaymentForBooking,
} from '../services/payment.service.js';

export async function startMockPayment(request, response) {
  const result = await startMockPaymentForBooking(request.params.bookingId, request.user, request.validatedPayment);
  response.status(result.message ? 201 : 200).json(result);
}

export async function getBookingPayment(request, response) {
  response.json(await getPaymentForBooking(request.params.bookingId, request.user));
}

export async function completeMockPayment(request, response) {
  response.json(await completeMockPaymentForBooking(request.params.bookingId, request.user));
}

export async function refundMockPayment(request, response) {
  response.json(await refundMockPaymentForBooking(request.params.bookingId, request.user));
}
