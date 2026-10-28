# Room and booking API notes

Current requests are documented in [HotelPro API request examples](part-1-api.md).

- Public room search: `GET /api/rooms`, with optional date range and inventory filters.
- Ordinary bookings: `POST /api/bookings`, `GET /api/bookings/my`, and `POST /api/bookings/cancel`.
- Admin room management lives under `/api/admin/rooms`; Admin booking and user views live under `/api/admin/bookings` and `/api/admin/users`.
- Booking totals are calculated by the API from `Room.rent`; caller-supplied totals are ignored.
- Date intervals use `fromdate` and `todate`, with checkout exclusive.
- Concurrent requests are checked atomically against room inventory and `currentBookings`.
