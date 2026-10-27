# Phase 3 API examples

Start MongoDB and the API, and create an administrator as described in the root README. Log in at `POST http://localhost:5000/api/auth/login`, then use the returned JWT as a bearer token for protected requests.

## Create a room

`POST /api/rooms` (admin)

```json
{
  "roomNumber": "204",
  "type": "double",
  "description": "City view with a queen bed",
  "capacity": 2,
  "pricePerNight": 145.5,
  "amenities": ["Wi-Fi", "Breakfast"]
}
```

The response includes the room `id`; use it as `roomId` below. Admins can update rooms with `PATCH /api/rooms/:id` and remove them from active inventory with `DELETE /api/rooms/:id`. Public search accepts filters such as `GET /api/rooms?type=double&minPrice=100&maxPrice=200&capacity=2&checkIn=2026-11-10&checkOut=2026-11-12`.

## Create a booking

`POST /api/bookings` (any authenticated account)

```json
{
  "roomId": "REPLACE_WITH_ROOM_ID",
  "checkIn": "2026-11-10",
  "checkOut": "2026-11-12",
  "guests": 2
}
```

The API returns `201 Created` with `totalAmount` equal to two nights at the room's current rate. Repeating the request for an overlapping night returns `409 Conflict`, including when concurrent requests race to book the same room. A stay may be up to 365 nights.

## List and update bookings

- `GET /api/bookings/my` returns the current account's bookings; optional pagination: `?page=1&limit=20`.
- `GET /api/bookings` returns all bookings to staff/admin; it supports the same pagination and an optional `status` filter.
- `PATCH /api/bookings/:id/cancel` cancels a booked reservation after any payment is resolved. Refund a paid payment first. Guests may cancel only their own; staff/admin may cancel any booked reservation.
- `PATCH /api/bookings/:id/check-in` checks a guest in during the scheduled stay dates after payment is completed. Staff/admin only.
- `PATCH /api/bookings/:id/check-out` checks out an in-house guest and makes the room nights available again. Staff/admin only.

The cancel, check-in, and check-out requests have no body. Check-out is exclusive, so the final occupied night is the calendar night before the check-out date.
