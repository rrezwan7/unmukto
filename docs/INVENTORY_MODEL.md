# Seat and room assignment correction

This branch changes the data model and adds one migration. It does not implement
booking, payment, live seat selection, resource holds or room-capacity enforcement.
No existing application table or assignment is deleted by this migration.

## What changes

- Seat assignment adds `departureId`. Uniqueness becomes
  `(departureId, vehicleId, seatId)`, so a seat can be reused on a different trip.
- The composite foreign key `(departureId, vehicleId)` requires an existing
  `DepartureVehicle` allocation. An allocated vehicle cannot be removed while
  referenced assignments exist.
- Existing seat assignments get their departure from Passenger → Booking. The
  migration aborts if an assignment cannot satisfy the new allocation foreign key.
- `Passenger.roomAssignments` becomes a collection. Uniqueness becomes
  `(passengerId, hotelStayId)`: one room per passenger per stay, multiple stays.
- V1 still has one transport seat assignment per passenger. Separate outbound /
  return segments, vehicle calendar conflicts, seat/layout membership, passenger /
  departure membership, stay/hotel/room membership and occupancy validation must
  be handled in the later assignment service before exposing assignment APIs.

## Validation

`npm test` includes embedded PostgreSQL (PGlite) tests executing the real emitted
DDL and backfill SQL from the migration packages. They check an empty database,
old assignment preservation, seat reuse across departures, duplicate seat denial,
vehicle allocation membership, rooms across two hotels, duplicate per-stay denial,
and rollback on inconsistent old data.

The two native PostgreSQL runner tests are skipped without `TEST_DATABASE_URL`.
They additionally check the actual Prisma migration runner, repeat migration,
filtered queries, relation loading, and Prisma transaction rollback. These tests
could not run in the ChatGPT environment: native PostgreSQL cannot run under its
available process identity, and the embedded TCP adapter failed in the CLI path.
The SQL checks do not replace the native runner checks.

## Local runner check — before changing the development database

Stop the local Next.js development server. Keep `.env`'s `DATABASE_URL` pointed
at localhost. Run:

```bash
npm ci
npm run test:inventory:local
```

This command uses the local connection only to create randomly named
`unmukto_inventory_test_...` databases. It applies and tests migrations there, then
drops those generated test databases. It never edits the configured application's
tables. The local role needs permission to create databases. A hosted connection
is rejected before connection. If permission is missing, configure a local role
with CREATEDB through your PostgreSQL administration tool; do not substitute a
hosted database URL. Do not publish credentials in test output or chat.

## Apply later, after the runner check passes

Back up the local development database first. Inspect the path using:

```bash
npx prisma db migrate --show
```

Confirm the pending path matches this branch and the local database. The new
migration is `20261011T2242_departure_scoped_assignments`, from the pricing/room
contract `b994449...` to `c4fd7104...`.

Then, when ready, apply the reviewed path and verify:

```bash
npx prisma db migrate --advance-ref db
npx prisma db verify
```

Do not use `db init`, reset the database, re-sign a mismatched database, or edit
existing migration packages to bypass failures. If an old assignment is missing
its departure-vehicle allocation, correct that operational record and retry;
the failed PostgreSQL migration transaction leaves the original data intact.

Keep this branch separate from `main` until local verification is complete.
Hosted/staging migration and code deployment require a separate coordinated step.
The database must be migrated before code that uses the new fields is deployed.
