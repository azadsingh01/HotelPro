# Phase 4 API examples

Use the JWT bearer token from `POST /api/auth/login`. The payment owner can create, inspect, and complete a mock payment for their booking. Refunds are full refunds and are allowed before check-in; a refunded booking can then be cancelled through the Phase 3 cancellation endpoint.

## Start and complete a mock payment

Start with a booking that has `paymentStatus: "unpaid"`:

`POST /api/bookings/BOOKING_ID/payments`

No request body is needed. The response contains a `pending` payment and its ID. Repeating the request returns the existing pending payment. HotelPro keeps one mock payment record per booking.

Complete the mock transaction:

`POST /api/payments/PAYMENT_ID/mock-complete`

The response contains a `paid` payment, and the booking's payment status becomes `paid`. Amount and currency come from the booking (`USD` in this phase); callers cannot set the amount. Zero-cost bookings do not need a payment record.

Inspect the record at `GET /api/bookings/BOOKING_ID/payments`.

## Refund a payment

`POST /api/payments/PAYMENT_ID/refund`

No body is needed. The mock payment and booking payment status become `refunded`. The booking remains reserved until it is cancelled with `PATCH /api/bookings/BOOKING_ID/cancel`, which releases its room nights. A pending payment must first be completed and refunded before cancellation. Refunds after check-in are rejected.

## Admin statistics

- `GET /api/admin/stats/overview` returns all-time booking counts, paid revenue, and today's occupancy totals/rate.
- `GET /api/admin/stats/today` returns the scheduled non-cancelled check-in and check-out counts for the current UTC calendar date.

Both endpoints require an admin bearer token. Revenue excludes records whose status is `refunded`; occupancy counts active bookings whose date interval includes today, divided by active rooms currently marked available.
