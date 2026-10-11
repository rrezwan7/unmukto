# Unmukto architecture review and implementation roadmap

Review date: 2026-10-11 UTC / 2026-10-12 Bangladesh.
Repository baseline: `6dca9cd2c17fdf689d6053773d5a86b518dea86e`.
Status: proposal for review; no application, schema, database, or deployment changes.

## Recommendation

Refactor the existing project. Do not restart it.

The existing Next.js App Router, TypeScript, PostgreSQL, Tailwind, and component setup fit a single operator selling its own scheduled tours. Tour → Departure → DeparturePricing is the correct starting relationship. Booking price snapshots are also a sound decision. The code is small enough to correct incrementally, and a fresh project would need the same booking rules and inventory safeguards.

Preserve the framework, repository, deployment direction, tour/departure separation, pricing approach, and reusable UI components. Correct assignment relationships and introduce application services, authorization, transactional reservations, and payment accounting before building customer checkout. Having no real data simplifies migrations; it does not require deleting the project or migration history.

The Prisma release candidate is a compatibility risk to evaluate, not a reason to restart. Retain it during this review. Before booking implementation, prove that the installed runtime supports filtered queries, transactions, locking or conditional writes, and the needed migrations. If that cannot be done reliably, propose an ORM replacement as a separate decision with its consequences. Do not silently change the existing Prisma decision.

## Scope and evidence

User requirements: own tours; browsing plus booking; payments; seats; rooms; admin; custom tours; blog; growth into a scalable platform. “Both” is interpreted as tour showcase plus online booking, not a marketplace. Custom tours are initially request-and-quote enquiries, not an automatic package builder. These interpretations remain open to correction.

Inspected: all current application pages and API routes, Prisma contract and generated artifacts, migration sources, package scripts/lockfile, and continuity documents. This is a static code review. A working database, production authorization layer, payment credentials, and deployment behavior have not been independently verified.

Reference inspected: https://grihotagi.com/ and https://grihotagi.com/events/54 . Its public page exposes itinerary, inclusions/exclusions, availability, passenger selection, booking money/full payment, payment methods, and booking approval guidance. These inform product workflows only; the site's private implementation and payment verification were not inspected. Its displayed journey date conflicts with the narrative dates, illustrating why Unmukto should derive display dates from one structured departure record.

## Findings to fix

| Priority | Evidence | Consequence and proposed action |
|---|---|---|
| Before public administration | Tour/departure/pricing POST handlers and admin pages have no authentication/authorization checks in this repository | Add authenticated sessions and server-side role checks to every admin read/write entry point. A protected page alone does not protect its API. External deployment protection was not verified. |
| Before seat booking | `SeatAssignment` is unique on `(vehicleId, seatId)` | A seat assigned on one departure cannot be reused on another while that assignment remains. Scope inventory to a departure vehicle/transport segment and seat. |
| Before multi-hotel tours | `RoomAssignment.passengerId` is globally unique; `Passenger.roomAssignment` is singular | One passenger cannot receive room assignments for multiple hotel stays. Use a collection and unique `(passengerId, hotelStayId)`. Enforce room capacity separately. |
| Before booking | No reservation/hold model, expiry, or booking creation service | Availability cannot yet be reserved safely. Add transactional capacity checks and reservations independent of physical seat assignment. |
| Before payment | `Payment.transactionId` is optional/nonunique; no verification or refund workflow | Add payment attempts, provider event deduplication, verification, manual review, and refund records. A transaction reference supplied by a customer is not proof of payment. |
| Before pricing UI | Pricing POST always calls `create`; `departureId` is unique | The second save fails rather than updating. Implement an atomic create/update operation with typed validation. |
| Before public APIs | `Number(...)`/`Boolean(...)` coercion; tour POST accepts raw body fields | Empty fares can become zero and `"false"` becomes true. Validate IDs, booleans, money strings, lengths, slugs, dates, and relationship membership explicitly. |
| Before production errors | Departure/pricing handlers return raw exception messages | Return stable public errors; retain diagnostics in server logs without credentials or passenger data. |
| Before growth | Detail pages and pricing API load entire tables with `.all()` and filter in memory | Use database filters, bounded selects, deterministic ordering, and paginated lists. Inspect the actual installed ORM API. |
| Before inventory APIs | Independent foreign keys do not establish cross-record consistency | Validate seat/layout/vehicle/departure membership and hotelStay/room/hotel membership; use composite constraints where practical. |
| Before pricing updates | Pricing, room option, and booking `updatedAt` use creation-time defaults | Ensure every mutation updates these timestamps or uses a verified update mechanism. |
| Before checkout | Booking amounts default to zero; payment and booking status concerns overlap | Require a server-generated quote, immutable snapshot and reservation lifecycle. Keep payment/refund state separate from trip lifecycle. |
| Before reliable delivery | `test.ts` is a type experiment, not assertions; no test script or CI workflow found | Add meaningful rule tests and PostgreSQL integration tests for transactions, assignment constraints, duplicate payments, and authorization. |
| Before handoff | `NEXT_SESSION.md` still references removed `PricingRule`; README is boilerplate | Establish one current status document and ADRs; update setup instructions. |
| Before public launch | Homepage is empty; metadata is starter text; pricing/seats/hotels sections are placeholders | Implement public pages and shared admin layout after core data rules, including loading/error/empty states and accessible forms. |

Password storage implementation does not exist in the inspected routes; a `password` column alone cannot establish whether passwords are hashed. Use a vetted auth solution and secure password handling rather than assuming the column is safe.

## Target architecture

Use a modular monolith: one Next.js application and one PostgreSQL database, with clear feature boundaries. Do not introduce microservices or multi-tenant marketplace models for this business model.

| Layer | Responsibility |
|---|---|
| Public pages and shared UI | Home, tours, tour details, departure selection, passenger forms, booking status, custom enquiry, blog |
| Admin pages | Tours, departures, pricing, transport inventory, hotel stays, bookings, payment review, content |
| Server entry points | Route handlers/server actions authenticate where needed, validate inputs, invoke services, and serialize safe responses |
| Feature services | Catalog, pricing, booking, inventory, payments, enquiries, content; own business rules and transaction boundaries |
| Persistence | Prisma runtime and PostgreSQL constraints/queries; database access stays server-side |
| Integrations | Payment adapter, image storage, email/SMS adapter; secrets stay on the server |
| Background work | Reservation expiry, notifications, payment reconciliation, retryable outbox processing |

Suggested incremental organization: retain `src/app`, `src/components/ui`, and `src/prisma`; add `src/features/{catalog,pricing,inventory,bookings,payments,enquiries,content}` as features are implemented. Add shared auth, validation, money, and error utilities only when needed. Server pages may call query/services directly; they need not call the application's own HTTP API.

Deploy to the existing Vercel direction with a compatible pooled PostgreSQL connection and an external scheduler/worker mechanism. Durable work must not depend on an in-process timer surviving a request. Keep development, staging, and production databases and payment configurations separate. Verify backup restore, not just backup creation.

## Proposed data model

Retain existing catalog, passenger, hotel, room, and content concepts. The following additions/changes are proposals, not applied schema.

| Area | Proposed relationship and rules |
|---|---|
| Tour | Reusable tour content, itinerary, destination information, images, inclusions/exclusions, difficulty and publishing state |
| Departure | Actual start/end timestamps, booking deadline, publication/operation status, declared sellable seat capacity and group limit |
| DeparturePricing | One record per departure; BDT currency, adult fare, child rules, deposit rule; prices validated as exact decimal strings |
| DepartureRoomOption | Existing Shared/Couple/Private choices, one surcharge per booking in V1, configurable limits; configuration is not physical room inventory |
| Transport segment | Departure-specific outbound/return/transfer segment; start with one segment if sufficient, but assignments have an explicit segment scope |
| DepartureVehicle / departure seats | Vehicle allocated to a segment; snapshot seat labels/layout; uniqueness within the allocation, not vehicle lifetime |
| HotelStay / room inventory | Departure-specific dated stay and contracted room/bed allotment; assignment validates hotel membership and capacity |
| Booking | Public reference, customer/contact relationship, lifecycle, expiry, idempotency key, policy version and immutable quote snapshot |
| Passenger | Passenger type, identity/contact data as needed, seat entitlement snapshot and minimal necessary personal data |
| SeatAssignment | Passenger + departure vehicle/segment + seat; one active occupant per inventory seat and one active seat per passenger per segment |
| RoomAssignment | Passenger + hotel stay + room; one assignment per passenger per stay, with enforced room capacity |
| Reservation | Booking + resource/scope + units + expiry/status; active holds and confirmed allocations count toward sellable capacity |
| Payment attempt/event | Booking, amount, BDT, method/provider, reference, verification state; provider reference/event deduplication with appropriate provider/account scope |
| Refund | Separate amount, status, reference, reason and audit history linked to the payment |
| CustomTourRequest | Contact, preferred dates, destination, group size, budget/requirements, request state; accepted quotation produces a departure/booking later |
| Audit / outbox | Who changed sensitive data; durable notifications and integration work created in the same transaction as the relevant state change |

Room capacity must account for actual nights/allotments. An option being enabled does not mean a physical room is available. For launch, choose explicit room allocations or a reviewed manual approval process before confirming a booking that needs lodging. If a room spans several passengers, reserve its inventory once, not once per passenger. Shared beds and exclusive rooms require different consumption rules.

Prevent overlapping hotel allotments from selling the same physical room twice and overlapping departure allocations from using the same vehicle incompatibly. Do not assume different departure IDs make overlapping resources available.

Use restrictions/archival for historically referenced records. Never cascade-delete approved payment or booking history as an ordinary admin action. Extend snapshots to cover currency, passenger counts, room choice/capacity, fare components, deposit and cancellation policy. Snapshot each passenger's seat entitlement so later child pricing changes cannot change inventory consumption.

## Business rules to retain and clarify

Existing repository decisions establish:

- At least one adult; children and infants may start at zero.
- Infants are free and consume no transport seat.
- Seats required = adults + children covered by the enabled child fare rule.
- One room choice per booking in V1. Surcharge applies once per booking.
- Couple adult limit normally two; other limits configured per departure.
- Historic bookings retain the booked price.
- Admin seat assignment first; customer seat selection later.
- A tour may have multiple hotel stays.

Calculate on the server using exact money arithmetic:

`total = adults × adultFare + children × applicableChildFare + oneRoomSurcharge`

Apply discounts/fees only if explicitly introduced; the browser's submitted total is never authoritative. Keep infant counts in occupancy checks even though fare and transport-seat use are zero, unless the operator explicitly defines a different occupancy policy. Validate age categories and couple/child limits before accepting passengers. Warn before changing passenger counts when a room switch makes the selection invalid.

Clarifications still needed before dependent implementation: passenger age boundaries; whether free children can purchase a seat; deposit amount/deadline; cancellation/refund rules; reservation expiry; manual payment review versus gateway first; rooms on each night; Bengali/English launch scope. These do not block the architecture review or initial environment/authentication work.

## Booking and payment workflow

1. Customer selects a published tour and open departure.
2. Server validates passenger counts, room capacity and current prices; returns a quote with a version/expiry.
3. On submission, revalidate or reject a changed quote. In one transaction lock/check capacity, create booking/passengers/snapshots, and reserve resources. Apply a unique idempotency key so retries do not create a second booking.
4. Initiate a payment attempt, or accept a manual payment reference as unverified. Show booking reference, payment state and deadline.
5. Verify gateway results through the provider's supported server verification; deduplicate callbacks/events. For manual payments, authorized staff verify against actual receipt before approval.
6. In a transaction record verified payment and convert an eligible active hold into a confirmed allocation. Partial payments confirm only if the deposit rule is met.
7. Admin assigns actual seats/rooms against reserved resources; assignment does not double-count already reserved capacity.
8. Expiry/cancellation releases the relevant active resources exactly once. Partial refund need not cancel a booking; refund and cancellation are distinct operations.

Pending/manual-review bookings need an explicit hold policy. On late payment after expiry, never confirm blindly: recheck resources and either re-reserve safely or send to exception review/refund. Expiry jobs and payment approval must lock the same reservation/booking records so only one transition wins. Declared inventory is independent of assignment, so an unassigned paid customer still occupies capacity.

Initial booking lifecycle proposal: pending → confirmed → completed, with expired/cancelled terminal alternatives. Payment attempts have their own pending/verified/failed/rejected states and separate refunds. This revises the current `REFUNDED` booking status; discuss that consequence in an ADR before changing it.

## Implementation roadmap and acceptance criteria

| Phase | Work | Completion evidence |
|---|---|---|
| 0 — Foundation | Reproducible install/build/lint/typecheck; staging environment; canonical status/ADRs; agree remaining rules; verify Prisma transactions/queries | Clean checkout checks pass; isolated database migration and transaction proof; no production reset |
| 1 — Protected admin | Session authentication, role checks for pages and APIs, typed inputs, safe errors, shared layout | Anonymous writes denied; customer role cannot manage tours; valid admin actions succeed; malformed inputs rejected |
| 2 — Schema corrections | Departure-scoped seats, per-stay room assignments, capacity/hold model, payment deduplication and snapshots | Same seat reusable on another nonoverlapping departure; same passenger assigned across two stays; conflicting assignments and overcapacity rejected |
| 3 — Operational admin | Tour/departure editing; pricing create/update; room options; inventory/allotments; visibility/booking controls | Price save twice updates one row; settings survive reload; departure cannot publish with incomplete required configuration |
| 4 — Public catalog | Home, tour list/details, itinerary, departure dates/availability, shared components and mobile layouts | Only eligible content visible; empty/sold-out states; dates consistent; accessible forms and meaningful metadata |
| 5 — Booking | Server quote, passengers, snapshots, transaction/holds, booking status, admin assignment | Two requests for the last seat yield one success; repeated request creates one booking; price edit leaves prior booking unchanged; expired holds release capacity |
| 6 — Payment | Chosen manual/gateway workflow, deposit/full payments, balance ledger, callbacks/review, refunds, notifications | Duplicate event credits once; unverified reference does not confirm; late payment handled; approval/expiry race safe; ledger reconciles |
| 7 — Launch content | Custom tour enquiries, blog admin/public pages, policies, mobile/accessibility/SEO, backup and operational checks | Enquiries tracked; drafts private; booking/payment failure recovery exercised; restore demonstrated; operator can run a departure |
| Later — Evidence-led growth | Customer seat choice, multiple rooms per booking, reporting and search improvements | Add only after V1 use establishes need; preserve existing contracts/history |

Do not schedule a full marketplace/SaaS build. Scalability here means bounded database reads, correct transactions, reusable components, reliable operations and measured performance.

## First implementation milestone

Start with reproducibility and protected admin access, then the schema corrections. Existing notes suggest pricing update next; this proposal moves authorization and inventory modeling ahead of customer booking because unauthenticated writes and incorrect resource scope affect the entire platform. Pricing UI can proceed once that foundation is established.

Keep changes on an isolated branch. Preserve existing migrations; generate new ones and verify on a disposable/staging database. Record architectural decisions without replacing working application files wholesale. For every milestone run the checks relevant to it and update one current handoff document.

## Validation limits

Baseline checks performed:

- `npm ci --ignore-scripts --no-audit --no-fund`: succeeded; lifecycle scripts intentionally not executed. Peer dependency warnings occurred in Prisma tooling dependencies.
- `npx next typegen`, then `npx tsc --noEmit --incremental false`: passed. The initial typecheck before generating Next route types reported missing `LayoutProps`; generation resolved it.
- `npm run lint`: failed with 16 errors and 59 warnings, including generated Prisma declaration/snapshot types. Do not hand-edit generated files to fix lint; configure generated-artifact exclusions in a subsequent implementation change.
- Source-only lint of `src/app`, `src/components`, and `src/lib`: no errors; three unused-variable warnings (the type experiment and homepage import).
- No production build or database integration tests were run. Database credentials were not supplied and historical deployment claims remain unverified.

This review does not claim that deployed endpoints were tested or that the database is in the state described by older continuity notes. Dependency/install and build verification results should be reported separately. `src/app/api/departures/[id]/pricing/test.ts` has no assertions and does not establish pricing correctness. No live booking or payment transaction was performed.
