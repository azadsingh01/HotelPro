# HotelPro

HotelPro is an existing MERN hotel booking and management app. The React/Vite client is deployed as a static site and the Express API serves JSON under `/api`.

## Features and role flows

- **Visitor:** Home page, signup, and login.
- **Ordinary user:** creates an account, signs in, searches rooms by dates, books and makes a mock payment, views booking history, and cancels a booking.
- **Admin:** signs in through the separate admin entry, views all bookings and users, and creates, edits, and removes rooms.
- Signup supports `Ordinary` and `Admin`. Admin signup requires the server-only `ADMIN_SIGNUP_CODE`; the client cannot grant itself Admin privileges.
- Passwords use bcrypt. JWT-protected routes use role checks. The booking API calculates nights and price from the selected room on the server.
- The mock card flow validates full card details for the request, then discards the card number and CVV. Only cardholder name, last four digits, expiry, and payment status are retained with the booking.

## Stack and layout

- Client: React, Vite, React Router, Bootstrap 5, Axios (`client/`)
- API: Node.js, Express, Mongoose, JWT, bcryptjs (`server/`)
- MVC: `server/models/`, `server/controllers/`, `server/routes/`, `server/middleware/`
- API entry: Express mounts route groups under `/api`, including `/api/auth`, `/api/user`, `/api/rooms`, `/api/bookings`, and `/api/admin`.
- Collections: `users`, `rooms`, and `bookings`. Safe mock payment details are embedded in bookings.

## Setup and Run

### Prerequisites

- Node.js 20 or newer and npm
- MongoDB Atlas or a local MongoDB server
- VS Code is optional; open this existing `HotelPro-project` folder (do not initialize a replacement project)

### Configure environment

Copy the examples, then set local values in the ignored `.env` files:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Set `MONGODB_URI`, a unique `JWT_SECRET` of at least 32 bytes, `CLIENT_ORIGIN`, and a private `ADMIN_SIGNUP_CODE` in `server/.env`. Use the database name `hotelpro` in the URI path and URL-encode special characters in Atlas passwords. The checked-in secret placeholders are intentionally unusable. `client/.env.example` points to `http://localhost:5000/api`; use that value for the default local API.

The seed script creates `admin@hotelpro.com` and `guest@hotelpro.com`. Set `ADMIN_PASSWORD` and `ORDINARY_PASSWORD` in the ignored `server/.env`; both must be unique passwords of 12–72 UTF-8 bytes. `ADMIN_NAME` and `ORDINARY_NAME` are optional. These seed-only values are intentionally omitted from `server/.env.example` and the passwords are never printed.

### Install and run the server

In a terminal:

```sh
cd server
npm install
npm run dev
```

The production-style server command is `npm start` from `server/`.

### Install and run the client

In a second terminal:

```sh
cd client
npm install
npm run dev
```

### Default URLs

- Client: `http://localhost:5173`
- Server: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

### Environment variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `PORT` | API | HTTP port; defaults to `5000`, Render sets it automatically |
| `NODE_ENV` | API | Runtime mode, such as `development` or `production` |
| `MONGODB_URI` | API and scripts | MongoDB connection string whose database path is `hotelpro`; URL-encode special characters in passwords |
| `JWT_SECRET` | API | Unique signing secret, at least 32 bytes |
| `JWT_EXPIRES_IN` | API | JWT lifetime; defaults to `1d` |
| `CLIENT_ORIGIN` | API | Allowed browser origin for CORS |
| `ADMIN_SIGNUP_CODE` | API | Private invitation code required to self-register an Admin |
| `VITE_API_URL` | Client build | API base URL including `/api` |
| `ADMIN_NAME`, `ADMIN_PASSWORD` | Seed / admin script | Optional Admin name and local seed password; add to ignored `server/.env` |
| `ORDINARY_NAME`, `ORDINARY_PASSWORD` | Seed | Optional Ordinary name and local seed password; add to ignored `server/.env` |

For an existing HotelPro database, back it up and run the schema migration before starting this release. It converts legacy string room numbers and booking dates, renames user/booking/reference fields, rebuilds room booking entries, strips legacy card/CVV fields, and synchronizes indexes. The migration is idempotent; it is never run automatically:

```sh
npm run migrate --workspace=server
```

To seed one configured Admin, one Ordinary user, and nine rooms with photo URLs, set the optional seed variables above and run from the project root:

```sh
npm run seed
```

To run both applications using the existing root workspace script, use `npm install` and `npm run dev` from the project root. Build the client with `npm run client:build`. Never commit `.env` files or real credentials.

## Data model

- **User:** `name`, unique `email`, bcrypt-hashed `password`, `phone`, and `userType` (`Ordinary` or `Admin`). Signup validates `c_password`, discards it, and validates Admin signup against `ADMIN_SIGNUP_CODE`.
- **Room:** unique numeric `roomNumber`, `description`, URL array `photos`, `type`, nightly `rent`, inventory `count`, and embedded `currentBookings[]` entries containing `bookingId`, `userid`, Date fields, and status. The app also retains capacity, amenities, and inventory status.
- **Booking:** `roomid`, `userid`, `type`, `username`, phone, Date fields, server-calculated `totaldays` and `totalAmount`, status, and safe `cardDetails` (`cardholdername`, `last4`, `expmonthyear`, `paymentStatus`).
- Booking creation rejects overlapping stays when no inventory remains. Cancellation marks the booking and its room reservation entry cancelled. Users can read and cancel only their own bookings; Admin routes can access all users and bookings.

## API overview

Protected requests use `Authorization: Bearer <JWT>`. Signup/login return a token and a public user object with `id`, `name`, `email`, `userType`, and `phone`; passwords are never returned. API responses use `{ "success": boolean, "message": "...", "data": ... }`; validation details are returned under `data.details`.

### Authentication

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | Public | Create Ordinary or code-verified Admin account; body includes `name`, `email`, `password`, `c_password`, `phone`, `userType`, and `adminCode` when Admin |
| POST | `/api/auth/login` | Public | Login either account type |
| POST | `/api/auth/admin-login` | Public | Admin-only login entry |
| GET | `/api/auth/profile` | Authenticated | Return the current public account |

### Rooms and bookings

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/rooms` | Public | Search rooms; optional `type`, `capacity`, `minRent`, `maxRent`, `fromdate`, `todate` |
| GET | `/api/rooms/:id` | Public | Read an active room |
| POST | `/api/bookings` | Ordinary | Create and mock-pay booking; body includes `roomid`, `fromdate`, `todate`, `guests`, and nested `cardDetails`; full card fields are transient and only safe card summary fields are saved |
| GET | `/api/bookings/my` | Ordinary | List only the signed-in user's bookings |
| POST | `/api/bookings/cancel` | Ordinary | Cancel own booking; body `{ "bookingId": "..." }` |

### Admin

All require a JWT for a user whose `userType` is `Admin`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/admin/bookings` | List all bookings; optional `status`, `page`, and `limit` |
| GET | `/api/admin/rooms` | List all rooms |
| POST | `/api/admin/rooms` | Create a room |
| PUT | `/api/admin/rooms/:id` | Edit room fields |
| DELETE | `/api/admin/rooms/:id` | Delete a room when it has no active bookings |
| GET | `/api/admin/users` | List all users without password fields |
| PATCH | `/api/admin/bookings/:id/check-in` | Check in a paid booking during its dates |
| PATCH | `/api/admin/bookings/:id/check-out` | Check out a guest |

The `/api/user/rooms` and `/api/user/bookings` aliases remain available for older HotelPro clients. The canonical paths above are used by the current client. See [Postman request examples](docs/part-1-api.md).

## Migration and seed

The `migrate` script normalizes legacy `type` to `userType`, converts old string dates to BSON Dates and room numbers to numbers, renames booking references and guest fields, rebuilds `currentBookings`, removes unsafe card fields, and synchronizes model indexes. It does not reset the database. Review and back up the target database before running it. See [the Part 5B migration note](docs/migrations/part-5b-models.md).

The database and seed changes for this part are documented in [the Part 5 database note](docs/migrations/part-5-database.md). No destructive database reset is performed.

`npm run seed` creates nine sample rooms and the fixed Admin/Ordinary email accounts only when those email addresses or room numbers are not already present. It does not delete unrelated data or overwrite existing users or rooms. It prints login emails and warns about demo passwords; passwords remain only in ignored `server/.env` and are not echoed to logs.

## Render deployment

Deploy the API as a Render Web Service from the repository root with build command `npm install` and start command `npm start`. Configure `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN`, `ADMIN_SIGNUP_CODE`, and `NODE_ENV=production`. Use `/api/health` for the health check. The server uses Render's `PORT` and binds to `0.0.0.0`.

Deploy the client as a Render Static Site using the client directory, build command `npm install && npm run build`, and publish directory `dist`. Set `VITE_API_URL` to the Render API URL ending in `/api` and rewrite `/*` to `/index.html` for React Router deep links.

## Verification commands

From the repository root:

```sh
npm run client:build
```

```powershell
Get-ChildItem server -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

The repository does not define an automated test suite. Use the API examples and the configured Postman environment to check signup/login, role protection, date availability, booking conflicts/cancellation, mock payment field retention, and Admin room/user/booking routes.
