# Unmukto — Project Status & Continuity

Last updated: 2026-11-14 (UTC)

## Current checkpoint

Working branch: `feature/admin-ui`. Production database migration and merging
into `main` are deferred. This session adds no schema changes or migrations.
The pre-existing uncommitted `package-lock.json` change must be preserved.

Use current code and the contract as the source of truth. Earlier status notes
incorrectly listed pricing and vehicle features as pending; they are implemented.

## Implemented

- Auth.js GitHub admin sign-in, numeric GitHub ID allowlist, protected admin pages
  and APIs, same-origin mutation checks, shared navigation and sign-out.
- Tour and departure creation/listing, and departure details.
- Departure passenger pricing create/update and room option management, with
  shadcn Base Nova forms. PostgreSQL numeric fares use strings in Prisma inputs.
- Vehicle creation/listing and reusable seat-layout assignment. Allocated vehicles
  cannot switch layouts. Seat-layout list and detail map pages are available.
- Departure vehicle allocation and departure-specific seat availability.
- Admin passenger seat assignment with booking/departure membership, allocation,
  seat/layout membership, enabled-seat and passenger eligibility checks. Eligible
  passengers are adults and paid children on pending/confirmed bookings; child
  eligibility uses the booking pricing snapshot. Infants do not consume seats.
- Departure-scoped seat assignment uniqueness and per-hotel-stay room assignment
  uniqueness are represented in the contract and migration packages.

The user reports manual testing of login, pricing/rooms, vehicle/layout assignment,
departure allocation/availability and passenger seat assignment before this session.

## Seat layout creation milestone

- `/admin/seat-layouts` now includes a name/optional-description form, reusing
  `POST /api/seat-layouts`; creation opens the new layout detail page.
- `/admin/seat-layouts/[id]` now adds seats one at a time through the existing
  `POST /api/seat-layouts/[id]/seats` batch endpoint with a single-seat payload.
  Fields: seat number (1–20 characters), row and column (1–100), enabled state.
- The API normalizes labels to uppercase and rejects duplicate labels/positions.
  The form displays server errors, preserves input on failure, prevents repeated
  submissions while saving, and refreshes the map/counts on success.
- Detail pages link back to the layout list. Layout changes affect all vehicles
  sharing that layout; gaps can represent aisles. Editing/removing existing seats
  and bulk seat-entry controls are not implemented.

## Hotel & Room Stays Management milestone

- `/admin/hotels` allows registering partner hotels (`name`, `location`, `phone`,
  `address`, `description`, `isActive`) using `POST /api/hotels` and lists all hotels.
- `/admin/hotels/[id]` manages physical rooms (`POST /api/hotels/[id]/rooms`),
  supporting `SHARED`, `COUPLE`, and `PRIVATE` room types, 1–20 passenger capacities,
  and room-number uniqueness within each hotel.
- `/admin/departures/[id]` now features live accommodation management via
  `DepartureHotelStays` and `StayRoomAssignmentPanel`, replacing the earlier placeholder:
  - Stays are scheduled with check-in and check-out dates (`POST /api/departures/[id]/hotel-stays`).
  - Stays can be removed when unassigned (`DELETE /api/departures/[id]/hotel-stays/[stayId]`).
  - Per-stay room assignment engine (`POST/DELETE /api/departures/[id]/hotel-stays/[stayId]/room-assignments`)
    enforces departure membership, active booking checks (`PENDING`/`CONFIRMED`), stay
    membership, room capacity limits, and per-stay uniqueness `(passengerId, hotelStayId)`.
- The in-memory table scans in `GET /api/departures/[id]/pricing` were replaced with
  database-filtered queries (`.where({ departureId }).first()` and `.all()`).
- Added "Hotels" to the primary admin navigation header.

## Public Tour Catalog milestone (Phase 4)

- Isolated public query service in `src/lib/catalog.ts` (`getPublicTours` and `getPublicTourBySlug`)
  strictly filtering published data (`isActive: true`, `customerVisible: true`, `isAvailable: true`).
- `/tours` catalog page rendering published tour cards with Bengali typography, starting fares,
  duration labels, upcoming departure counts, and seat availability badges.
- `/tours/[slug]` tour detail page with SEO metadata, day-by-day itinerary timeline with
  destination arrival/departure schedules, scheduled departures list, transparent pricing &
  room option surcharge breakdown, and traveler inclusions.
- Shared public header (`src/components/public-header.tsx`) and footer (`src/components/public-footer.tsx`),
  linking navigation on the homepage directly to `/tours`.

## Stack and database

Next.js 16.3.8, React 19.2.8, TypeScript 5, Tailwind CSS 4, shadcn/Base UI,
PostgreSQL and Prisma 8 contract-based ORM (`@prisma/orm-postgres` rc.13).
The Prisma CLI dependency is rc.18; this is separate from the ORM runtime version.

Read `AGENTS.md` and relevant installed Next.js guides before writing Next.js code.
Read `.agents/skills/prisma-8/SKILL.md` before database queries. Do not use
traditional `@prisma/client` patterns. Existing queries use `db.orm.public`,
`.where(...).first()` / `.all()` and the installed transaction API.

Contract: `src/prisma/contract.prisma`, emitted `contract.json` / `contract.d.ts`.
Runtime: `src/prisma/db.ts`; configuration: `prisma.config.ts`.
Migration packages on disk:

1. `20261004T2132_baseline`
2. `20261004T2133_pricing_and_room_options`
3. `20261011T2242_departure_scoped_assignments`

Packages on disk do not prove a database has applied them. Production migration
status has not been checked in this session. See `docs/INVENTORY_MODEL.md` for
migration scope and isolated local runner instructions. Its historical notes about
assignment validation predate the implemented admin seat-assignment APIs.

## Business rules to preserve

- At least one adult; children and infants are optional. Infants are free and
  require no transport seat. Transport seat count is adults plus paid children.
- Shared/Couple/Private room capacities are configured per departure option.
  V1 selects one room option per booking. Room surcharge applies once per booking,
  not per passenger. Customer copy says “surcharge”, never “upcharge”.
- Bookings retain fare, child-pricing and room-surcharge snapshots; later pricing
  changes must not rewrite existing bookings.

## Verification

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 9 passed, 2 skipped (no `TEST_DATABASE_URL`). The successful run
  followed stopping the pre-existing dev server; sandbox process inspection did
  not see that server, and earlier attempts failed before completing HTTP tests.
- `npm run build`: passed.
- `git diff --check`: passed; the existing lockfile checksum is unchanged.

`npm test` includes auth policy/HTTP access tests and embedded PostgreSQL migration
checks. The HTTP suite now covers seat-layout endpoints, hotel endpoints, room endpoints,
departure stay endpoints, room assignment endpoints, and page protection.
Stop any running `next dev` server before tests: the HTTP suite starts its own.
Two native PostgreSQL migration tests may skip without `TEST_DATABASE_URL`;
configure only an isolated localhost test server to run those checks.

## Remaining work

Manually verify the new layout/seat forms with an authorized admin and local DB:
create a layout, add enabled/disabled seats, leave an aisle, reject duplicate
labels/positions, reload the map, then assign the layout to a vehicle. This
session does not use live OAuth or write application database records.

Customer booking/reservations, holds/capacity enforcement, customer seat selection,
and payment flows remain future work (Phase 5 & 6).
Payment methods are separate from pricing.

Do not run production migrations or merge into `main`. Coordinate migration and
deployment separately. Never print environment files or credentials.
