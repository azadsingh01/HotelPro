# Part 5 database and seed note

- The API and scripts connect through `server/config/db.js` using `MONGODB_URI`. The URI must select the `hotelpro` database. No URI or password is stored in this note.
- The existing `users`, `rooms`, and `bookings` collections remain in place. Startup creates the declared model indexes. Safe payment details are embedded in bookings; full card numbers and CVVs are not model fields.
- Room type `deluxe` is now accepted alongside the existing types. Existing documents need no conversion.
- `npm run seed` is insert-only for the fixed seed emails and room numbers. Existing matching records are skipped; unrelated data is never deleted or overwritten. The seed does not provide a reset operation.
- Set `ADMIN_PASSWORD` and `ORDINARY_PASSWORD` in the ignored `server/.env` before seeding. Passwords are hashed with bcryptjs and are intentionally not printed or committed. Change them before a demo or deployment.
