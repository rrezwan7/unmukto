# Unmukto — Project Status & Continuity

Last updated: 2026-11-22 (Asia/Dhaka)

## Current checkpoint

Working branch: `feature/gemini-next-task`. Vercel deploys production from
`main`. The owner reports that the homepage, catalog, and fare calculator from
the previous release work on Vercel and confirmed that production admin login
with GitHub works.

The development workspace and Vercel share one hosted PostgreSQL database. The
guest reservation migration was applied and verified on that database on
2026-11-22 (Asia/Dhaka). The feature branch adds manual confirmation and
booking-specific assignment links. The manual confirmation migration has also
been applied and verified on the shared database. The owner tested booking
confirmation, bus seat assignment, and hotel room assignment successfully on
localhost. Vehicle and seat editing and guarded departure vehicle removal have
passed browser checks on a disposable database. Hotel, room, and scheduled
stay editing passed the same verification. Confirmed guest reservations now show
bus seat and hotel room assignment progress. Staff room allotments and
overlapping-departure capacity checks passed on disposable PostgreSQL. The
room allotment migration awaits approval on the shared database before this
checkpoint can be deployed.

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
  sharing that layout; gaps can represent aisles. Adding or editing a seat
  requires confirmation when multiple vehicles use the layout.

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

## Tour and itinerary editing

- Open **Admin → Tours → Edit tour** for the title, description, cover image,
  and publication status. Existing public tour URLs keep their slug. The
  catalog cards and tour detail pages display the saved cover.
- Archiving hides a tour from visitors and new departure creation. Staff can
  republish it from the same editor. Departures, bookings, and assignments
  remain accessible to staff.
- The **Itinerary** section adds, edits, removes, and reorders days and stops.
  Save writes the whole itinerary in one transaction. Existing day and stop
  IDs persist through reordering, and the public itinerary uses the saved
  order. Times can retain Bengali digits.
- Stops linked to hotel stays and days containing those stops cannot be
  removed. The server checks this again on save. Stale saves return a conflict
  and leave the current itinerary intact.

## Departure editing

- Open **Admin → Departures → Select a departure → Edit departure**. Staff can
  edit departure and return dates and times, customer visibility, and whether
  to accept new bookings. Dates are entered and displayed in Bangladesh time.
- Booking or assignment history locks the schedule. Staff can still close or
  hide that departure and manage its existing reservations and assignments.
- For a public departure to reopen booking, its tour must be published and
  it needs a future schedule, pricing, an available room option, and an
  active customer-visible vehicle with enabled seats.
- Schedule changes and new vehicle allocations check for overlaps. A vehicle
  can start another trip at the previous one's known return time. With a
  blank return time, the vehicle is considered in use through the return
  date, or through the departure date if the return date is blank.
- Hotel stays must fit within the known travel dates. Creating a second
  overlapping stay for the same hotel on one departure is blocked. Room
  availability accounts for other departures that share the hotel.

## Vehicle and seat layout editing

- Open **Admin → Vehicles → Edit** to change the name, type, registration,
  description, and active status. Deactivation hides the vehicle from customers
  and new allocations. Historical allocations and assigned seats stay readable.
- On a seat layout page, choose an existing seat to edit its label, row, column,
  or enabled status. Labels and positions must be unique within the layout.
  An assigned seat keeps its label, position, and availability. Disable unused
  seats to retire them.
- **Admin → Departures → Departure Vehicles** can remove an allocation after
  confirmation if it has no passenger seat assignments and enough capacity
  remains. Active trips keep enough customer-visible seats for bookings and
  active holds. Future public departures open for booking must retain at
  least one enabled seat on a customer-visible vehicle.
- Transport configuration changes, seat assignment, and reservation holds
  coordinate through database locks so concurrent requests enforce the same
  assignment and capacity rules.

## Hotel, room, and stay editing

- Open **Admin → Hotels → Manage hotel** to update the hotel's details and
  active status. Inactive hotels are excluded from new stays. Existing stays
  and room assignments remain manageable.
- Open a room from the hotel detail page to change its number, type, capacity,
  or notes. Room numbers are unique within a hotel. A room's capacity must
  cover the passengers already assigned to it on each stay.
- Open **Admin → Departures → Scheduled Stays → Edit Stay** to change the hotel,
  check-in and check-out dates, or optional itinerary stop. Dates use the
  Bangladesh calendar and must fit within the trip. A hotel's stays on the
  same departure may meet at checkout and must otherwise be disjoint.
- Room assignments and allotments lock a stay's hotel and dates. Staff can
  still link the stay to a stop on the departure's itinerary. Removing a stay
  requires releasing its allotments and unassigning its passengers.

## Room allotments across departures

- Open **Admin → Departures → Scheduled Stays → Manage Room Assignment → Room
  allotments** to reserve shared places or a whole private or couple room for a
  stay. Capacity is measured per Bangladesh calendar night. Another stay may
  check in on the previous stay's checkout day.
- A shared room uses the larger of its allotment and assigned passenger count
  for each stay. A private or couple room uses one whole room on each night,
  and new assignments within that room are limited to a single booking.
  Assignments also use available inventory when there is no explicit allotment.
- Assignment history stays intact. Releasing an allotment leaves assigned
  places committed. If legacy assignments overlap beyond capacity, the room
  panel marks the conflict and blocks new assignments until it is resolved.
- Allotment changes, assignments, and room edits lock the same physical room
  before they validate capacity. Room edits cannot reduce capacity below
  reservations and assignments, or switch between shared and exclusive while
  commitments exist. Guest booking still uses manual lodging verification.

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
  **Admin → Departures → Open a departure → Guest reservations** shows
  contact details, passenger names and types, the requested room, payment
  amounts, and hold deadlines. Staff can filter pending, confirmed, expired,
  and cancelled reservations. **Allow guest booking** controls who can
  submit a hold. **Confirm booking** is the separate staff action for
  approving an active hold.
- For manual verification, staff enter the full amount independently verified
  as received, the payment method, and its receipt or transaction reference.
  Staff verify lodging for every stay when the booking includes a room
  request. A zero-fare booking needs no payment record.
- Confirmation locks the departure and booking, rechecks the hold and transport
  capacity, switches the booking to `CONFIRMED`, and records the verified
  payment, staff GitHub ID, and confirmation time in one transaction.
  Duplicate confirmation keeps the existing result. A manual payment reference
  can be recorded once per payment method. Expired holds are sent to staff
  review. The original quoted fare and passenger eligibility are preserved.
- The existing bus seat and hotel room assignment tools are on the departure
  detail page under the allocated vehicle and **Hotel Stays → Manage Room
  Assignment**. The assignment APIs accept confirmed bookings and older
  pending bookings that have no expiry. A new pending guest hold is ineligible
  for both kinds of assignment until it is confirmed. Links on a confirmed
  booking open the assignment tools filtered to that booking's passengers.
  Confirmed reservations show assigned and required bus seats based on their
  pricing snapshot, plus completed hotel stays for bookings that requested a
  room. Opening a reservation shows how many passengers have a room at each
  scheduled stay. Assigning seats or rooms, removing room assignments, or
  changing the stay list refreshes the summary.
  Room assignment edits and stay removal now lock the stay before
  checking occupancy or existing assignments.
- The booking records one requested room option. Staff coordinate its
  availability, then reserve and assign physical rooms by stay. Customer-facing
  lodging holds, gateway payment verification, and automatic confirmation
  remain future work.

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
5. `20261121T2144_manual_booking_confirmation`
6. `20261121T2205_itinerary_stop_order`
7. `20261122T0950_room_allotments`

Prisma `db verify` confirmed that the shared database marker and actual schema
match the contract after migration 6. The stop-order column defaults to zero,
so existing stops keep their previous ID-based order until staff save an
itinerary. Migration 7 adds allotments and an index for room occupancy checks.
It preserves existing assignments and passed `db migrate` and `db verify` on
isolated PostgreSQL. The shared database remains at migration 6. Apply migration
7 there only with the owner's approval, before deploying this checkpoint.
Use a disposable PostgreSQL instance for automated mutation and concurrency tests. See `docs/INVENTORY_MODEL.md` for isolated local runner
instructions.

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
- `npm test`: 19 passed with an isolated PostgreSQL server.
- `npm run build -- --webpack`: passed. Turbopack could not bind its worker
  port in the local tool environment.
- `git diff --check`: passed.
- An isolated PostgreSQL integration check verified the guest toggle, updated
  quote revalidation, simultaneous last-seat requests, idempotent retries,
  the 15-minute expiry, and reuse of released capacity.
- The production-built admin form persisted both guest booking settings against
  the isolated database.
- The production-built guest review page rendered the pending, confirmed,
  expired, and cancelled filters against isolated PostgreSQL. Guest contact
  details stayed behind admin sign-in.
- Isolated PostgreSQL checks verified full payment validation, expired hold
  rejection, payment reference deduplication, unchanged capacity on
  confirmation, and exactly one payment for repeat confirmation. The
  production-built admin form confirmed a booking, and HTTP checks exercised
  its assignment links, a bus seat assignment, and two simultaneous requests
  for the last place in a room.
- Manual room checks covered assignment/removal after reload, one passenger at
  two hotels, and rejection of a stale selection for a room that just filled.
- The tour editor passed authenticated production-build checks on disposable
  PostgreSQL covering archive and republish, legacy Bengali times, stable IDs,
  public itinerary order, concurrent saves, and blocking removal of a
  hotel-linked stop.
- Departure editing passed authenticated production-build checks for date and
  time changes, Bangladesh dates around midnight, closing and reopening,
  preserving reservation history, and rejecting concurrent vehicle and
  hotel-stay overlaps.
- Authenticated transport checks on disposable PostgreSQL verified vehicle
  edits and historical seat assignments, shared layout confirmation, duplicate
  labels and positions, stale edits, booking and hold capacity checks, and
  concurrent seat edits and assignments. Headless Chrome verified saving a
  vehicle, confirming a shared seat edit, and removing a departure vehicle.
- Authenticated accommodation checks on disposable PostgreSQL verified hotel
  archive and reactivation, per-stay occupancy, duplicate room numbers,
  Bangladesh date boundaries, itinerary stop ownership, and concurrent
  edits and assignments. Headless Chrome verified saving all three edit
  forms and showed that room assignments lock a stay's hotel and dates.
- Headless Chrome verified that confirmed reservation summaries use the
  booking's child seat eligibility and count room assignments separately for
  each hotel stay. It also verified booking-specific links, pending and empty
  states, and live count changes after assigning a bus seat, assigning a room,
  and removing a room assignment on disposable PostgreSQL.
- Authenticated allotment checks on disposable PostgreSQL verified overlapping
  shared places, exclusive rooms, same-day reuse, legacy conflicts, room and
  stay edit guards, and concurrent claims on the last capacity. Headless Chrome
  verified saving and releasing shared places and releasing an exclusive room.

`npm test` includes auth policy/HTTP access tests and embedded PostgreSQL migration
checks. The HTTP suite covers vehicle and seat layout edits, departure vehicle
removal, hotel, room, and stay edits, room allotments and assignments, and page
protection.
Stop any running `next dev` server before tests: the HTTP suite starts its own.
Two native PostgreSQL migration tests may skip without `TEST_DATABASE_URL`;
configure only an isolated localhost test server to run those checks.

## Implementation plan

### 1. Production admin access

- The owner confirmed GitHub sign-in works on Vercel. The production OAuth
  callback is `https://unmukto.vercel.app/api/auth/callback/github`. See
  `docs/ADMIN_SETUP.md` for configuration.
- Before opening live guest booking, verify opening a departure, saving a
  booking setting, and sign-out on the production hostname.

### 2. Guest reservation review and approval

- Manual verification is the current mode, as requested by the owner. For this
  release, staff confirm after verifying the full quoted total and lodging for
  every stay. Establish a deposit policy before supporting partial payment.
- Expiry is derived from `holdExpiresAt` and the record remains available for
  review. A replacement hold must check current capacity again.
- Add cancellation with staff audit details and a refund workflow when the
  payment policy is agreed. Test the confirmation and cancellation race when
  that transition is available.

### 3. Connect confirmed guests to bus and hotel assignment

- **Assign bus seats** and **Assign hotel rooms** now link from confirmed
  bookings to the existing departure tools with that booking selected.
  Guest Reservations shows seat counts and room assignment progress by stay
  for each confirmed booking.
- Reuse the seat and room assignment APIs. Filter buses to the departure's
  allocated vehicles and seats to its enabled layout entries. Respect seat
  eligibility from the booking snapshot. Keep each room assignment scoped to
  one hotel stay so the same guest can have a room at every stop.
- Staff can set by-stay allotments. Shared and exclusive room availability
  accounts for overlapping departures and existing assignments. Guest checkout
  still requires lodging holds before it can offer guaranteed rooms.
- Acceptance checks cover a new guest from quote through confirmation and
  assignments, independent assignments at two hotels, an infant excluded
  from bus seating, concurrent attempts for the last seat or room place, and
  refresh after assignment. Assigning a bus seat must count the confirmed
  passenger only once in capacity.

### 4. Add editing and archiving for admin records

| Area | Missing controls and acceptance criteria |
| --- | --- |
| **Tours and itineraries** | **Edit Tour** and the day and stop editor are implemented and verified on disposable PostgreSQL. Verify the normal browser editing flow on localhost. |
| **Departures** | Editing the schedule, visibility, and booking status is implemented. Use hide and close to retire departures with history. |
| **Vehicles and seat layouts** | Vehicle details and active status, shared seat layout edits, and guarded departure vehicle removal are implemented and verified on disposable PostgreSQL. |
| **Hotels, rooms, and stays** | Hotel details and active status, physical room editing, and guarded hotel stay editing are implemented and verified on disposable PostgreSQL. |

- Reuse the existing admin forms and protected write patterns. Keep new edit
  pages discoverable from the matching list or detail page. Show validation
  errors without losing edits.
- Prefer reversible archive or close actions for records with history. Allow
  permanent removal only after explicit confirmation and a transaction-level
  dependency check. Ensure archived entries leave public listings and new
  selections while historical bookings and assignments remain readable.

### 5. Complete checkout and verify a release

- Add customer accounts and the signed-in booking path for when guest booking
  is disabled. Keep customer identity separate from admin authorization.
- Decide deposit, payment verification, refund, and cancellation rules. Handle
  late payments through review and capacity revalidation. Run a full booking
  rehearsal with the operator before opening the live guest flow.
- After payment gateway integration, add an admin setting to select manual
  or automatic verification. Make both modes use the same confirmation
  rules for capacity, expiry, and payment deduplication.
- For each slice, run lint, typecheck, tests, and the production build. Use an
  isolated PostgreSQL instance for mutations and concurrency tests, since
  local development and Vercel share the hosted database. Review any new
  migration and coordinate merge to `main` and deployment separately.
- Update this document and the Bangla homepage milestone copy when an
  acceptance check passes and changes the current project status.
