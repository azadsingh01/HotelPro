# Legacy migration note

The original Part 1 migration has been superseded by the current schema migration. For existing databases, use the Part 5B migration instructions instead:

```sh
npm run migrate --workspace=server
```

See [Part 5B schema migration](part-5b-models.md) for current field names, migration effects, and safety checks. The old command remains as a compatibility alias but now runs the current migration. Always back up MongoDB and verify `MONGODB_URI` before running a migration.

`npm run seed` creates one Admin, one Ordinary user, and nine sample rooms without overwriting matching users or rooms. Passwords are hashed with bcryptjs and are intentionally not printed or committed.
