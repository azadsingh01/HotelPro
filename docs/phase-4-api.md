# Mock payment and Admin operations

Mock payment is part of `POST /api/bookings`; there is no separate payment collection or real charge. The API validates the card form, stores only cardholder name, last four digits, expiry, and payment status, and discards the full card number and CVV.

Admin booking and statistics routes are under `/api/admin`. Admin room edits use `PUT /api/admin/rooms/:id`; deletion is rejected while the room has booked or checked-in stays.

Admin room create and update accept `photos` as an array of HTTP(S) image URLs. Multipart requests can send those URLs in `photoUrls` (a URL or JSON array) and attach up to five image files in the `photos` field. Files are limited to 2 MB and served from `/uploads`. URL-hosted photos are preferred: Render's free service disk is ephemeral, so uploaded files can disappear on redeploy or instance replacement.

API success and error responses use `{ "success": boolean, "message": "...", "data": ... }`. Validation details, when present, are at `data.details`.
