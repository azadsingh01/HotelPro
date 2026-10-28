# Part 5B schema migration

Run this once against a backup or a separate test database before deploying the schema change. It is an explicit command and is not run by server startup or `npm start`.

```sh
cd server
npm run migrate
```

The migration is idempotent. It:

- normalizes user `type`/`role` into `userType` (`Admin` or `Ordinary`) and removes the legacy fields;
- converts legacy room labels such as `HP-101` into numeric `roomNumber` values, aborting before writes if they collide;
- renames booking references and guest fields to `userid`, `roomid`, `username`, and canonical `cardDetails` fields;
- converts booking and embedded room booking dates to BSON Date values and rebuilds `currentBookings` using `bookingId` and `userid`;
- keeps only cardholder name, last four digits, expiry, and `paid`/`pending`/`failed` payment status; full card numbers and CVV fields are removed without being printed;
- scrubs unsafe card fields from a legacy `payments` collection if it exists, then synchronizes indexes for the three active models.

The migration retains existing user passwords, booking totals, rooms, and unrelated collections. Missing/invalid user names or emails, normalized email collisions, missing room descriptions, invalid room numbers, booking dates/references, malformed embedded reservation dates, or room-number collisions stop the migration before it writes records. Review those source records, correct them in the test copy, and rerun. Legacy users without a usable phone are left without a fabricated number; backfill those accounts before they need an update that validates the required phone field. Run `npm run seed` after a successful migration if the database needs the demo accounts and sample rooms.

Check MongoDB Atlas after running: `users.userType` is `Ordinary` or `Admin`; `rooms.roomNumber` is numeric and each `currentBookings` entry has `userid` plus Date-valued `fromdate`/`todate`; `bookings` has `userid`, `roomid`, `username`, Date-valued dates, and `cardDetails` with no PAN/CVV fields. Confirm the `users`, `rooms`, and `bookings` indexes use the new field names.
