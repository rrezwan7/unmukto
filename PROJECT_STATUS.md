# Unmukto — Project Status & Continuity

Last updated: 2026-11-22 (Asia/Dhaka)

## Current checkpoint

Working branch: `feature/gemini-next-task`. Vercel deploys production from
`main`. The owner reports that the homepage, catalog, and fare calculator from
the previous release work on Vercel. The production admin GitHub login still
needs its production OAuth credentials.

The development workspace and Vercel share one hosted PostgreSQL database. The
guest reservation migration was applied and verified on that database on
2026-11-22 (Asia/Dhaka). GitHub's `main` branch still lacks the guest
reservation endpoint and Booking Settings page. The feature branch contains
both and is ready for review.

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
  **Admin → Departures → Open a departure → Pending guest reservations** lists
  active holds. This list is currently read-only. **Allow guest booking**
  controls who can submit a hold. A per-booking approval action has yet to be
  built.
- The existing bus seat and hotel room assignment tools are on the departure
  detail page under the allocated vehicle and **Hotel Stays → Manage Room
  Assignment**. The assignment APIs accept confirmed bookings and older
  pending bookings that have no expiry. A new pending guest hold is ineligible
  for both kinds of assignment until it is confirmed.
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

## Implementation plan

### 1. Restore production admin access

- The live `/login` page reports that setup is incomplete. Vercel Production
  already had `AUTH_SECRET`. The production `AUTH_URL` and the verified owner's
  numeric ID in `ADMIN_GITHUB_IDS` have been added.
- The remaining configuration is `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` in
  Vercel Production, from a GitHub OAuth app with the callback
  `https://unmukto.vercel.app/api/auth/callback/github`. Enter the credentials
  directly into Vercel. See `docs/ADMIN_SETUP.md`.
- Redeploy the existing production release after both credentials are saved.
  Verify that `/login` shows the sign-in button and that clicking it sends the
  browser to GitHub with the production callback.
- Verify sign-in, opening a departure, saving an admin setting, and sign-out on
  the production hostname. Keep guest booking off while confirmation and room
  availability are being tested.

### 2. Add guest reservation review and approval

- Extend **Pending guest reservations** into a departure-specific booking list.
  Show the booking reference, contact and passengers, quoted total, requested
  room, amount received if applicable, and expiry in Bangladesh time. Provide
  pending, confirmed, expired, and cancelled views with clear action feedback.
- Add an admin-only **Confirm booking** action backed by one shared transition
  service. Start with an isolated test scenario. Before enabling it for live
  guests, agree on the payment or authorized manual approval rule and the
  lodging availability rule. Store the staff identity, time, and outcome when
  a booking is approved or cancelled.
- In the confirmation transaction, lock in a consistent order with booking
  creation, re-read the booking and expiry using database time, and validate
  the booking's departure and required capacity. For an eligible active hold,
  transition `PENDING` to `CONFIRMED` once, keep fare snapshots, and convert the
  seat hold into committed capacity. Validate lodging for each stay before
  promising a room. An expired hold must go to staff review. Any replacement
  hold must check capacity again.
- Decide how expired reservations are represented in storage. The current
  system derives expiry from `holdExpiresAt` and excludes elapsed holds from
  availability. Preserve access to the booking record for later review.
- Acceptance checks include unauthorized requests, approval twice, approval at
  the expiry boundary, an expired hold after its seat is resold, and concurrent
  confirmation and cancellation. Confirming must keep availability stable, and
  the quote and booking must retain the original fare snapshot.

### 3. Connect confirmed guests to bus and hotel assignment

- Show **Assign bus seat** and **Assign hotel rooms** next to each confirmed
  booking. Link to the existing departure tools with that booking selected.
  Display which passengers have seats and which hotel stays still need rooms.
  Keep staff in the same departure after each assignment.
- Reuse the seat and room assignment APIs. Filter buses to the departure's
  allocated vehicles and seats to its enabled layout entries. Respect seat
  eligibility from the booking snapshot. Keep each room assignment scoped to
  one hotel stay so the same guest can have a room at every stop.
- Serialize changes to contested hotel rooms before the capacity check. When
  moving a passenger, handle both rooms in a consistent lock order. Define
  by-stay room allotments and account for overlap between departures before
  offering guaranteed lodging. Shared rooms consume places and exclusive
  rooms consume a room. Preserve existing assignment data during the change.
- Acceptance checks cover a new guest from quote through confirmation and
  assignments, independent assignments at two hotels, an infant excluded
  from bus seating, concurrent attempts for the last seat or room place, and
  refresh after assignment. Assigning a bus seat must count the confirmed
  passenger only once in capacity.

### 4. Add editing and archiving for admin records

| Area | Missing controls and acceptance criteria |
| --- | --- |
| **Tours and itineraries** | Add **Edit Tour** and an **Itinerary** editor under Tours. Edit title, description, cover, and publication state. Add, edit, reorder, and remove itinerary days and destination stops with descriptions and arrival or departure times. Preserve existing IDs on edits and reorder. Reject deletion or require an explicit reassignment when a destination is referenced by a hotel stay. Check that saved itinerary changes appear in order on the public tour page. Keep the existing slug stable unless a safe URL change is planned. |
| **Departures** | Edit departure and return dates and times, customer visibility, and whether bookings are open. Validate chronology, vehicle/stay overlaps, and existing booking commitments. Give staff a clear way to close bookings. Guard date changes or removal when reservations, assignments, or payments exist. |
| **Vehicles and seat layouts** | Edit vehicle details and active state. Add departure vehicle removal where assignments and capacity permit. Add seat label, position, and availability edits with duplicate checks. Guard changes to a shared layout and removal or disabling of an assigned seat. |
| **Hotels, rooms, and stays** | Edit hotel details and active state, room number/type/capacity, and scheduled stay details. Guard capacity reductions below occupancy and date or hotel changes that affect assignments or allotments. Preserve the existing remove-stay and unassign-room controls. |

- Reuse the existing admin forms and protected write patterns. Keep new edit
  pages discoverable from the matching list or detail page. Show validation
  errors without losing edits.
- Prefer reversible archive or close actions for records with history. Allow
  permanent removal only after explicit confirmation and a transaction-level
  dependency check. Ensure archived entries leave public listings and new
  selections while historical bookings and assignments remain readable.
- The order within this step is tour and itinerary first, then departure edit,
  vehicle and seat layout edit, and hotel, room, and stay edit.

### 5. Complete checkout and verify a release

- Add customer accounts and the signed-in booking path for when guest booking
  is disabled. Keep customer identity separate from admin authorization.
- Decide deposit, payment verification, refund, and cancellation rules. Handle
  late payments through review and capacity revalidation. Run a full booking
  rehearsal with the operator before opening the live guest flow.
- For each slice, run lint, typecheck, tests, and the production build. Use an
  isolated PostgreSQL instance for mutations and concurrency tests, since
  local development and Vercel share the hosted database. Review any new
  migration and coordinate merge to `main` and deployment separately.
- Update this document and the Bangla homepage milestone copy when an
  acceptance check passes and changes the current project status.
