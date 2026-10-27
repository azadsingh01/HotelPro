# Phase 2 Postman examples

Start MongoDB and the API, then use `http://localhost:5000` as the Postman collection's `baseUrl`. The importable collection is [HotelPro-Phase-2.postman_collection.json](../postman/HotelPro-Phase-2.postman_collection.json).

## Register a guest

`POST {{baseUrl}}/api/auth/register`

```json
{
  "name": "Morgan Lee",
  "email": "morgan.lee@example.com",
  "password": "HotelPro!2026",
  "phone": "+14155550123"
}
```

Expected response: `201 Created`, a guest `user`, and a signed `token`. Public registration always assigns the `guest` role. Reusing an email returns `409 Conflict`; including a `role` field returns `400 Bad Request`.

## Log in

`POST {{baseUrl}}/api/auth/login`

```json
{
  "email": "morgan.lee@example.com",
  "password": "HotelPro!2026"
}
```

Expected response: `200 OK`, a safe `user` object, and a new signed `token`. The Postman collection saves this token as `{{token}}`. An unknown email or incorrect password returns `401 Unauthorized` with the same message.

## Get the current profile

`GET {{baseUrl}}/api/auth/profile`

Set the Authorization type to **Bearer Token** and use the token returned from register or login. The importable collection already sends `Authorization: Bearer {{token}}`.

Expected response: `200 OK` with a `user` object. The response does not include a password. Missing, invalid, or expired tokens return `401 Unauthorized`.
