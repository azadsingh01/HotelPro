import { matchedData } from 'express-validator';
import {
  cancelCustomerBooking,
  checkInBookingById,
  checkOutBookingById,
  createBookingForUser,
  listAdminBookings,
  listCustomerBookings,
} from '../services/booking.service.js';

function getPagination(request) {
  const filters = matchedData(request, { locations: ['query'] });
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  return { page, limit };
}

export async function createBooking(request, response) {
  const values = matchedData(request, { locations: ['body'] });
  // PAN and CVV were discarded by the route after validation; persist only safe derived fields.
  if (values.cardDetails) {
    delete values.cardDetails.cardNumber;
    delete values.cardDetails.cvv;
  }
  const result = await createBookingForUser(values, request.stayDates, request.user, request.validatedPayment);
  response.status(201).json(result);
}

export async function getMyBookings(request, response) {
  const { page, limit } = getPagination(request);
  response.json(await listCustomerBookings(request.user._id, page, limit));
}

export async function getAllBookings(request, response) {
  const filters = matchedData(request, { locations: ['query'] });
  const { page, limit } = getPagination(request);
  response.json(await listAdminBookings(filters, page, limit));
}

export async function cancelBooking(request, response) {
  response.json(await cancelCustomerBooking(request.params.id ?? request.body.bookingId, request.user));
}

export async function checkInBooking(request, response) {
  response.json(await checkInBookingById(request.params.id));
}

export async function checkOutBooking(request, response) {
  response.json(await checkOutBookingById(request.params.id));
}
