# Unmukto — Project Status & Continuity

Last updated: 2026-11-22 (Asia/Dhaka)

## Current checkpoint

Working branch: `feature/gemini-next-task`. Vercel deploys production from
`main`. The owner reports that the homepage, catalog, and fare calculator from
the previous release work on Vercel. The production admin GitHub login still
needs attention.

The development workspace and Vercel share one hosted PostgreSQL database. The
guest reservation migration was applied and verified on that database on
2026-11-22 (Asia/Dhaka). The guest reservation code is on the feature branch
pending review and deployment.

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
  seat/layout membership, enabled-seat and passenger eligibility checks. Adults
  and paid children on confirmed bookings and older pending bookings without an
  expiry can be assigned. Child eligibility uses the booking pricing snapshot.
  Infants do not consume seats.
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
    enforces departure membership, booking eligibility, stay
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
- The homepage shows a Bangla progress indicator at `/#progress`, calculated
  from six of ten milestones, with completed and remaining work listed.

## Guest reservations and seat holds (Phase 5)

- `POST /api/booking-quote` calculates fares on the server for the selected
  departure, passenger counts, and room option. The quote includes a version
  for detecting fare changes at submission.
- **Admin → Booking Settings → Allow guest booking** is off by default. Fare
  quotes remain available when guest booking is off. Customer accounts and
  customer sign-in are still pending.
- When enabled, `POST /api/reservations` saves contact details, passengers,
  pricing snapshots, a booking reference, and a 15-minute seat hold in one
  transaction. The departure row lock serializes last-seat requests, and the
  reservation key makes retries idempotent.
- Availability checks exclude expired holds as soon as their deadline passes.
  The admin departure page lists active guest reservations. New pending
  reservations are visible to staff, with seat and room assignment available
  after confirmation.
- The booking records one requested room option. Physical room inventory holds,
  payment, and booking confirmation remain future work.

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
4. `20261121T1722_guest_reservation_holds`

Prisma `db verify` confirmed that the shared database marker and actual schema
match the emitted contract after migration 4. There is no manual migration
remaining for this release. Use a disposable PostgreSQL instance for development
tests that create or modify data. See `docs/INVENTORY_MODEL.md` for isolated local
runner instructions.

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
- `npm test`: 13 passed with an isolated PostgreSQL server.
- `npm run build`: passed.
- `git diff --check`: passed.
- An isolated PostgreSQL integration check verified the guest toggle, updated
  quote revalidation, simultaneous last-seat requests, idempotent retries,
  the 15-minute expiry, and reuse of released capacity.
- The production-built admin form persisted both guest booking settings against
  the isolated database.
- Manual room checks covered assignment/removal after reload, one passenger at
  two hotels, and rejection of a stale selection for a room that just filled.

`npm test` includes auth policy/HTTP access tests and embedded PostgreSQL migration
checks. The HTTP suite now covers seat-layout endpoints, hotel endpoints, room endpoints,
departure stay endpoints, room assignment endpoints, and page protection.
Stop any running `next dev` server before tests: the HTTP suite starts its own.
Two native PostgreSQL migration tests may skip without `TEST_DATABASE_URL`;
configure only an isolated localhost test server to run those checks.

## Remaining work

- Fix and verify GitHub admin sign-in on Vercel before enabling live guest
  reservations.
- Add customer accounts for booking when guest booking is off.
- Define hotel room allotments by stay and add room inventory holds.
- Add payment and confirmation, including handling payments that arrive after a
  hold expires. Admin seat selection remains the operational path.
- Test simultaneous admin requests for the last physical room spot before multiple
  staff members use room assignment.
