# HotelPro

HotelPro is a hotel booking and operations app in a React + Express monorepo. Guests can search rooms, reserve dates, manage reservations, and complete mock payments. Administrators manage inventory and view hotel statistics.

## Features

- Guest registration, login, JWT-protected profile lookup, and role checks for guest, staff, and admin accounts.
- Public room search by room type, nightly price range, guest capacity, and stay dates.
- Admin room inventory create/read/update/delete, soft removal, and restoration.
- Date-based bookings with server-calculated totals and a unique room/night database index to prevent concurrent double bookings.
- Guest booking history and cancellation; staff/admin booking lists and check-in/check-out operations.
- Mock payment creation, completion, and refund records linked to bookings.
- Admin overview with booking totals, paid revenue, occupancy, and today's scheduled arrivals/departures.
- Responsive React interface with protected routes, loading states, and success/error toasts.
- Repeatable demo seed for admin, staff, and guest accounts plus ten sample rooms.

## Tech stack

| Area | Stack |
| --- | --- |
| Frontend | React 19, Vite 7, React Router, Bootstrap 5, Axios |
| Backend | Node.js 20.19+, Express 5, async/await |
| Database | MongoDB with Mongoose 8 |
| Authentication | bcryptjs password hashing, signed JWT bearer tokens |
| API protection | express-validator, Helmet, CORS, express-rate-limit, centralized JSON errors |

## Repository layout

~~~text
HotelPro/
├── client/                 React/Vite application
├── server/
│   ├── config/             Environment and MongoDB connection
│   ├── controllers/        Request handlers
│   ├── middleware/         Authentication, roles, 404 and error handling
│   ├── models/             User, Room, Booking, Payment
│   ├── routes/             REST API routes and validation
│   ├── scripts/            Admin creation script
│   ├── seed.js             Demo users and room seed
│   └── utils/              Date, token, validation, and API error helpers
├── docs/                   API examples
└── postman/                Phase 2 Postman collection
~~~

## Requirements

- Node.js 20.19 or newer
- npm
- MongoDB running locally or a MongoDB Atlas cluster

## Local setup

1. Install dependencies from the repository root:

   ~~~sh
   npm install
   ~~~

2. Create both local environment files:

   ~~~sh
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ~~~

   In PowerShell, use:

   ~~~powershell
   Copy-Item server/.env.example server/.env
   Copy-Item client/.env.example client/.env
   ~~~

3. Start MongoDB, then edit server/.env. Set MONGODB_URI and choose a unique JWT_SECRET with at least 32 bytes. Generate a random JWT secret with:

   ~~~sh
   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   ~~~

4. Seed the database with demo users and sample rooms:

   ~~~sh
   npm run seed
   ~~~

   The seed command replaces only records created by its previous run, tracked by their MongoDB IDs in a private seed manifest. It stops if a demo email or room number is already owned by another record. The seeded demo credentials are listed below; change them before exposing a deployment publicly.

   | Role | Email | Password |
   | --- | --- | --- |
   | Admin | admin@hotelpro.com | Admin@12345 |
   | Staff | staff@hotelpro.com | Staff@12345 |
   | Guest | guest@hotelpro.com | Guest@12345 |

5. Run the API and client together:

   ~~~sh
   npm run dev
   ~~~

   The API defaults to http://localhost:5000; Vite defaults to http://localhost:5173. Check API/database readiness at http://localhost:5000/api/health. A healthy response has status "ok" and database "connected".

Run one workspace by itself with npm run dev --workspace=server or npm run dev --workspace=client. Build the client with npm run client:build; start the API with npm start.

## Environment variables

Server values belong in server/.env. Client values belong in client/.env. Environment files are ignored by Git; only example files should be committed.

| Variable | Used by | Required | Description |
| --- | --- | --- | --- |
| PORT | Server | No | HTTP port. Defaults to 5000; Render supplies this automatically. |
| NODE_ENV | Server | No | Use development locally and production when deployed. |
| MONGODB_URI | Server/scripts | Yes | MongoDB connection string. Include the hotelpro database name in the URI. |
| CLIENT_ORIGIN | Server | No | The single allowed browser origin, such as http://localhost:5173; set it to the deployed Vercel origin in production. Do not include a trailing slash. |
| JWT_SECRET | Server | Yes | Unique random signing secret of at least 32 UTF-8 bytes. Never expose it to the browser. |
| JWT_EXPIRES_IN | Server | No | jsonwebtoken duration string; defaults to 1d. |
| ADMIN_NAME | Admin creation script | Optional | Display name used by the separate admin:create command. |
| ADMIN_EMAIL | Admin creation script | Optional | Email used by the separate admin:create command. |
| ADMIN_PASSWORD | Admin creation script | Optional | Password used by the separate admin:create command; 12–72 UTF-8 bytes. |
| VITE_API_URL | Client build | No | API base URL including /api; defaults to http://localhost:5000/api. This value is public in the built client and must contain no secrets. |

## API

All endpoints are prefixed with /api. Protected endpoints require Authorization: Bearer <token>. Successful responses are JSON. Validation errors return HTTP 400, permission errors return 403, and conflicting state/unique records return 409.

### Health and authentication

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | /health | Public | API and MongoDB readiness |
| POST | /auth/register | Public | Create a guest account |
| POST | /auth/login | Public | Authenticate and return a JWT |
| GET | /auth/profile | Authenticated | Return the current account profile |

### Rooms

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | /rooms | Public | Search with type, minPrice, maxPrice, capacity, checkIn, and checkOut query parameters |
| GET | /rooms/:id | Public | Get an active room |
| GET | /rooms/manage | Admin | List all inventory, including inactive rooms |
| POST | /rooms | Admin | Add a room |
| PATCH | /rooms/:id | Admin | Update room fields or restore an inactive room |
| DELETE | /rooms/:id | Admin | Soft-remove a room from active inventory |

Room types are single, double, twin, suite, and family. Inventory statuses are available, maintenance, and out_of_service.

### Bookings

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | /bookings | Authenticated | Create a booking; body: roomId, checkIn, checkOut, guests |
| GET | /bookings/my | Authenticated | List the current guest's bookings; supports page and limit |
| GET | /bookings | Staff/admin | List bookings; supports status, page, and limit |
| PATCH | /bookings/:id/cancel | Owner, staff, admin | Cancel before check-in after resolving any payment |
| PATCH | /bookings/:id/check-in | Staff/admin | Check in a paid booking on its scheduled stay dates |
| PATCH | /bookings/:id/check-out | Staff/admin | Check out an in-house guest |

Dates must be real YYYY-MM-DD calendar dates. Check-out is exclusive. A stay is limited to 365 nights. The API derives the amount from the current room rate multiplied by the number of nights. The room/night unique index prevents simultaneous overlapping reservations for the same room.

### Payments and admin statistics

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | /bookings/:bookingId/payments | Owner, staff, admin | Start the booking's mock payment |
| GET | /bookings/:bookingId/payments | Owner, staff, admin | List payment records for a booking |
| POST | /payments/:paymentId/mock-complete | Owner, staff, admin | Mark a pending mock payment as paid |
| POST | /payments/:paymentId/refund | Owner, staff, admin | Refund a paid booking before check-in |
| GET | /admin/stats/overview | Admin | Booking totals, net paid revenue, current-day occupancy |
| GET | /admin/stats/today | Admin | Scheduled check-ins and check-outs for the UTC day |

Mock payments do not charge a card or move money. The booking and payment records are separate MongoDB documents; the implementation uses guarded updates and compensation, but a process/database failure between writes can require manual reconciliation. Use MongoDB transactions and a real payment provider before handling real payments.

## Postman examples

Import postman/HotelPro-Phase-2.postman_collection.json to try register, login, and profile lookup. The collection saves the token returned by login. Request body examples for rooms, bookings, and statistics are in [Phase 3 API examples](docs/phase-3-api.md) and [Phase 4 API examples](docs/phase-4-api.md).

Example room search:

~~~http
GET http://localhost:5000/api/rooms?type=double&capacity=2&minPrice=100&maxPrice=200&checkIn=2030-04-10&checkOut=2030-04-12
~~~

Example booking request:

~~~json
{
  "roomId": "REPLACE_WITH_ROOM_OBJECT_ID",
  "checkIn": "2030-04-10",
  "checkOut": "2030-04-12",
  "guests": 2
}
~~~

## Screenshots

The repository does not currently include captured screenshots. The responsive interface includes Home, room search, room details/booking, login/register, My Bookings, and the admin dashboard. Add captures under docs/screenshots/ and embed them here when available.

## Deployment: MongoDB Atlas, Render, and Vercel

Deploy the API and frontend as separate services. Keep MongoDB credentials and JWT secrets in the server environment only.

### 1. MongoDB Atlas

1. Create an Atlas project and cluster.
2. Create a database user with only the permissions required for the HotelPro database. Save its password securely.
3. In Network Access, allow the Render service's outbound IP addresses. For a temporary demo where stable egress IPs are unavailable, 0.0.0.0/0 can restore connectivity, but it allows network attempts from any IP; use a strong database password and replace it with a narrower rule as soon as possible.
4. Copy the standard connection string, replace its placeholders, and include /hotelpro as the database name, for example mongodb+srv://<user>:<password>@<cluster-host>/hotelpro?retryWrites=true&w=majority. URL-encode special characters in the username or password.

Atlas requires clients to connect from an allowed project IP access list entry. See the [Atlas IP access list documentation](https://www.mongodb.com/docs/atlas/security/ip-access-list/) and [connection string guidance](https://www.mongodb.com/docs/atlas/connect/).

### 2. Render API

1. Push the repository to a Git provider and create a Render Web Service from it.
2. Set the service Root Directory to server. Set the build command to npm install and the start command to npm start.
3. Add environment variables in Render:
   - NODE_ENV=production
   - MONGODB_URI to the Atlas connection string
   - JWT_SECRET to a unique random value of at least 32 bytes
   - JWT_EXPIRES_IN=1d (or your chosen duration)
   - CLIENT_ORIGIN to the production Vercel site origin after you create it
4. Configure the Render health check path as /api/health. After deployment, confirm it returns HTTP 200 and reports a connected database.

The service binds to 0.0.0.0 and reads Render's PORT environment variable. The production API enables one trusted proxy hop so rate limits can use the originating client IP. See [Render's Express deployment guide](https://render.com/docs/deploy-node-express-app) and [monorepo root directory guide](https://render.com/docs/monorepo-support).

### 3. Seed the production database once

Run the seed command from a machine that can access the Atlas cluster, or from the Render service shell if available:

~~~sh
npm run seed
~~~

When running locally, use the same production MONGODB_URI in server/.env and make sure your current IP is temporarily allowed in Atlas. The seed command only replaces records tracked by its manifest and leaves other users and rooms untouched. These sample credentials are public development defaults; do not expose them on an internet-facing deployment.

### 4. Vercel frontend

1. Import the same Git repository into Vercel as a separate project.
2. Set Root Directory to client, select the Vite framework preset, use npm run build as the build command, and dist as the output directory.
3. Set VITE_API_URL to https://<your-render-service>.onrender.com/api.
4. Deploy. The included client/vercel.json rewrite sends client-side routes to index.html, allowing refresh/deep links such as /rooms/:id and /admin.
5. Copy the deployed site origin, such as https://hotelpro.example.vercel.app, into Render's CLIENT_ORIGIN, then redeploy the API.

See [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite) for current Vite deployment and SPA rewrite behavior.

### 5. Production smoke check

- Open the Vercel site and load Home, Rooms, Login, and a direct nested route.
- Call https://<your-render-service>.onrender.com/api/health; verify MongoDB is connected.
- Register a guest, sign in as the seeded admin, create a room, and confirm search can retrieve it.
- Create a future booking and test the mock payment lifecycle. Do not enter real card information; the app has no payment processor.
- In browser developer tools, confirm API requests target the Render URL and the browser's origin matches CLIENT_ORIGIN.

## Security and current scope notes

- Public signup always assigns the guest role. The seed creates demo admin, staff, and guest accounts; there is no staff-management API.
- /auth/profile reads the current user's profile. Self-service profile editing is not currently exposed by an API or page.
- Access tokens are stored in browser localStorage; protect against cross-site scripting and consider HttpOnly secure cookies before broader production use.
- Authentication endpoints have a stricter rate limit; the API also applies a global rate limit, request-size limit, Helmet headers, CORS, field validation, and centralized errors.
- This is a demo-ready foundation. Review backups, logging/monitoring, secret rotation, payment processing, transaction handling, and operational access controls before using it for a real hotel.

