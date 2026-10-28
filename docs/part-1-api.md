# HotelPro API request examples

Set `baseUrl` to the API origin and send protected requests with `Authorization: Bearer {{token}}`. Use future dates in booking examples. Signup and login return a JWT, but the signup page intentionally discards it and redirects the user to Login.

## Create an Ordinary account

`POST {{baseUrl}}/api/auth/signup`

```json
{
  "name": "Morgan Lee",
  "email": "morgan.lee@example.com",
  "password": "HotelPro!2026",
  "c_password": "HotelPro!2026",
  "phone": "14155550123",
  "userType": "Ordinary"
}
```

Admin account creation requires `"userType": "Admin"` and `"adminCode": "{{adminSignupCode}}"`. The code is compared to the server's `ADMIN_SIGNUP_CODE`. Wrong or missing codes are rejected. Confirm-password is validated then discarded.

## Login

`POST {{baseUrl}}/api/auth/login`

```json
{ "email": "morgan.lee@example.com", "password": "HotelPro!2026" }
```

For the separate Admin login entry, use `POST {{baseUrl}}/api/auth/admin-login` with the same fields. Both return the JWT and `{ "name", "email", "userType" }` under `data` in the standard success envelope.

## Search rooms for dates

`GET {{baseUrl}}/api/rooms?capacity=2&fromdate=2027-01-10&todate=2027-01-12`

No token is required. When dates are supplied, the response includes only room records with available inventory for the entire requested range. Checkout is an exclusive date.

## Create and mock-pay a booking

`POST {{baseUrl}}/api/bookings` with an Ordinary JWT:

```json
{
  "roomid": "REPLACE_WITH_ROOM_ID",
  "fromdate": "2027-01-10",
  "todate": "2027-01-12",
  "guests": 2,
  "cardDetails": {
    "cardholdername": "Morgan Lee",
    "cardNumber": "4242 4242 4242 4242",
    "expmonthyear": "12/30",
    "cvv": "123"
  }
}
```

The server calculates `totaldays` and `totalAmount` from the stay and current room rent. The number is reduced to `last4` before the request reaches the controller; CVV is validated and discarded. No payment is charged. The response includes the booking and safe `cardDetails` only.

## List and cancel your bookings

`GET {{baseUrl}}/api/bookings/my?page=1&limit=20` with an Ordinary JWT.

`POST {{baseUrl}}/api/bookings/cancel` with an Ordinary JWT:

```json
{ "bookingId": "REPLACE_WITH_BOOKING_ID" }
```

Only the owner can cancel. A cancelled booking cannot be cancelled again. Cancellation updates its room's `currentBookings` entry and changes its mock payment status to `failed` when it had been paid or pending.

## Admin rooms, bookings, and users

Create an Admin JWT via Admin login, then send it as a bearer token.

`GET {{baseUrl}}/api/admin/bookings`

`GET {{baseUrl}}/api/admin/rooms`

`POST {{baseUrl}}/api/admin/rooms`

```json
{
  "roomNumber": 204,
  "type": "double",
  "description": "City view with a queen bed",
  "photos": ["https://images.example.com/room-204.jpg"],
  "capacity": 2,
  "rent": 145.5,
  "count": 3,
  "amenities": ["Wi-Fi", "Breakfast"]
}
```

`PUT {{baseUrl}}/api/admin/rooms/ROOM_ID` accepts any supported room fields as a partial update, for example:

```json
{ "rent": 155, "count": 4, "photos": ["https://images.example.com/room-204-updated.jpg"] }
```

`DELETE {{baseUrl}}/api/admin/rooms/ROOM_ID` removes the room from active inventory and preserves booking history. `GET {{baseUrl}}/api/admin/users?page=1&limit=50` returns public account fields only.

## Error format

Validation and application errors use JSON:

```json
{ "message": "The submitted data is invalid.", "details": [{ "field": "email", "message": "Enter a valid email address." }] }
```
