# Unmukto — Project Status & Continuity

Last updated: 2026-10-05

## 1. Project

Unmukto is a travel/tour booking website being developed for the user's uncle.

Reference website:

https://grihotagi.com/

Repository:

https://github.com/rrezwan7/unmukto

---

# 2. Technology Stack

* Next.js 16.3.6
* React 19.2.8
* TypeScript 5
* PostgreSQL
* Prisma 8 RC
* Tailwind CSS 4
* shadcn/ui
* Vercel
* GitHub

---

# 3. Development Philosophy

The immediate priority is to **build and deliver the working website quickly**.

Learning and refactoring can happen progressively after the core functionality is working.

Do not over-engineer.

Do not build future features before they are needed.

Prefer the smallest working implementation that can later be improved.

---

# 4. Source of Truth

When information conflicts, use this priority:

1. Current repository code
2. Database schema and migrations
3. This `PROJECT_STATUS.md`
4. Conversation history
5. General assumptions

The actual installed Prisma contract/runtime is the source of truth for Prisma API behavior.

Do not assume that examples written for older Prisma versions work with this project.

---

# 5. Current Project Setup

## Next.js

The application is running successfully with the App Router.

Current admin routes include:

* `/admin/tours`
* `/admin/tours/new`
* `/admin/departures`
* `/admin/departures/new`
* `/admin/departures/[id]`

API routes currently include:

* `/api/tours`
* `/api/departures`
* `/api/departures/[id]/pricing`

Vercel deployment is working successfully.

---

# 6. Database / Prisma

PostgreSQL is configured locally.

Prisma 8 contract-based setup is being used.

Important files:

* `src/prisma/contract.prisma`
* `src/prisma/contract.json`
* `src/prisma/contract.d.ts`
* `src/prisma/db.ts`
* `prisma.config.ts`

Database migrations currently include:

* `20261004T2132_baseline`
* `20261004T2133_pricing_and_room_options`

Migration status has been verified as up to date.

---

# 7. Prisma 8 Project-Specific Lessons

This project uses the newer Prisma 8 contract-based ORM runtime:

```text
@prisma/orm-postgres/runtime
```

Do **not** automatically apply traditional Prisma Client examples.

## PostgreSQL numeric fields

PostgreSQL `numeric` fields are represented as strings in the generated Prisma 8 contract input.

For example:

```ts
await db.orm.public.DeparturePricing.create({
    departureId,
    adultFare: String(adultFare),
    childFeeEnabled,
    childFare: String(childFare),
});
```

Important:

* `departureId` is a number.
* `adultFare` is a string.
* `childFare` is a string.
* `childFeeEnabled` is a boolean.

Passing numbers directly to the numeric fields caused TypeScript errors.

## Query methods

Do not assume traditional Prisma Client methods exist.

For example:

```ts
.findFirst()
```

was not available in the installed API.

The working approach for the current code is to use supported collection methods such as:

```ts
.all()
```

and filter the returned records when appropriate.

## Mutation methods

Do not assume traditional Prisma Client `.update()` syntax.

The exact mutation API must be determined from the installed Prisma 8 contract/runtime.

Before implementing an unfamiliar database operation:

1. Check the generated contract.
2. Check the installed runtime API/types.
3. Make a small test.
4. Use the syntax that actually compiles.

## General Prisma 8 rule

**Never force the code to match old Prisma documentation.**

If the generated contract says a field is a string, use a string.

If a familiar Prisma method does not exist, investigate the installed API instead of repeatedly trying traditional Prisma syntax.

---

# 8. Confirmed Business Rules

## Adult pricing

Each departure has one adult base fare.

Example:

* Adult fare = ৳5,000

---

## Room pricing

Room options can have a one-time surcharge.

Example:

* Shared = +৳0
* Couple = +৳5,000
* Private = +৳4,000

Examples:

* 1 adult + Shared = ৳5,000
* 2 adults + Shared = ৳10,000
* 2 adults + Couple = ৳15,000
* 3 adults + Private = ৳19,000

The room surcharge is applied **once per booking**, not once per person.

Customer-facing text should use wording such as:

> Couple Room: +৳5,000

Do not use "upcharge" in the customer-facing UI.

---

# 9. Room Rules

Available room types:

* Shared
* Couple
* Private

Shared Room is the default room option.

Shared can accommodate multiple people according to its configured capacity.

V1 does not allow customers to select multiple rooms within one booking.

If the selected room cannot accommodate the group:

* warn the customer
* recommend another room option
* or recommend multiple bookings

Room capacities are configurable **per departure and room option**.

They should not be hardcoded globally.

Couple room:

* maximum 2 adults
* accompanying children may be allowed according to configured rules

Private room:

* configurable maximum total occupants

Shared room:

* configurable maximum total occupants

---

# 10. Passenger Rules

Passenger types remain:

* Adult
* Child
* Infant

## Adults

Minimum:

```text
1
```

## Children

Minimum:

```text
0
```

A child requires at least one adult.

Child pricing can be:

* disabled/free
* enabled with a configured fare

When child pricing is enabled, the child fare includes a transport seat.

## Infants

Infants are always:

```text
Free
```

and consume:

```text
0 transport seats
```

---

# 11. Transport Seat Calculation

Transport seats are calculated as:

```text
Adults + paid children
```

Infants consume zero seats.

Example:

```text
2 adults
+ 1 paid child
+ 1 infant
= 3 transport seats
```

---

# 12. Passenger Counter Rules

Customer-facing counters use:

```text
Minus | Number | Plus
```

Rules:

* Adults minimum = 1
* Children minimum = 0
* Infants minimum = 0

When Couple/Private capacity is reached:

* decrease the passenger count if necessary
* disable the `+` button at the maximum

When switching back to Shared:

* do not automatically restore a previously higher passenger count

---

# 13. Booking Price Snapshot

Existing bookings must not change when future departure prices change.

Therefore bookings store pricing values at the time of booking.

Current booking snapshot fields include:

* `adultFareAtBooking`
* `childFareAtBooking`
* `roomSurchargeAtBooking`
* `childFeeEnabledAtBooking`

The booking also stores the selected room option.

Future consideration:

If necessary, store additional room information such as the room type at booking so historical bookings remain understandable even if room options are later changed.

---

# 14. Current Pricing Schema

The old pricing system based on:

```text
PricingCategory
PricingRule
```

has been removed.

The new system uses:

```text
DeparturePricing
DepartureRoomOption
```

## DeparturePricing

Contains:

* departureId
* adultFare
* childFeeEnabled
* childFare
* createdAt
* updatedAt

One pricing record exists per departure.

---

## DepartureRoomOption

Contains:

* departureId
* roomType
* surcharge
* maxAdults
* maxChildren
* maxOccupants
* description
* isAvailable
* displayOrder
* createdAt
* updatedAt

A departure cannot have duplicate room types.

---

# 15. Current API Progress

## Departure API

Departure creation/list functionality is working.

---

## Pricing API

Route:

```text
/api/departures/[id]/pricing
```

### GET

Working.

Returns:

* departure pricing
* room options

Example when no pricing exists:

```json
{
  "success": true,
  "pricing": null,
  "roomOptions": []
}
```

### POST

Working.

A real local test was successfully completed for Departure `1`.

Test data:

```text
Adult fare: 5000
Child fee enabled: true
Child fare: 3000
```

Successful response returned:

```text
adultFare: "5000"
childFare: "3000"
childFeeEnabled: true
departureId: 1
id: 1
```

GET was then used to confirm the data was stored and returned correctly.

---

# 16. Current Admin UI

Departure details page:

```text
/admin/departures/[id]
```

currently displays placeholders for:

* Pricing
* Vehicles & Seats
* Hotels

The Pricing placeholder needs to become a functional admin section.

---

# 17. Current Development Checkpoint

The latest pricing implementation has been committed and pushed to GitHub.

Confirmed working:

* Next.js
* PostgreSQL
* Prisma 8
* Prisma contract
* baseline migration
* pricing migration
* departure API
* pricing GET API
* pricing POST API
* successful database write
* successful database read
* Vercel deployment

---

# 18. Immediate Next Tasks

## Step 1 — Pricing Update

Implement update/upsert for `DeparturePricing`.

Required behavior:

If pricing does not exist:

```text
Create
```

If pricing already exists:

```text
Update
```

Do not create duplicate pricing records.

Use the actual Prisma 8 contract/runtime API.

Do not assume traditional Prisma Client `.update()` syntax.

---

## Step 2 — Room Options API

Implement CRUD functionality for:

* Shared
* Couple
* Private

Each option should support:

* surcharge
* maximum adults
* maximum children
* maximum occupants
* description
* availability
* display order

---

## Step 3 — Admin Pricing UI

Replace the Pricing placeholder on:

```text
/admin/departures/[id]
```

with a working admin form.

The form should manage:

### Passenger Pricing

* Adult fare
* Child fee enabled/disabled
* Child fare

### Room Options

* Shared
* Couple
* Private
* Surcharge
* Capacity
* Description
* Availability

Keep the first version simple.

---

## Step 4 — End-to-End Test

Test:

1. Create pricing
2. Read pricing
3. Update pricing
4. Read updated pricing
5. Create room option
6. Read room option
7. Update room option
8. Disable/remove room option
9. Reload admin page
10. Confirm database and UI match

---

# 19. After Pricing

Next major feature:

## Vehicles & Seats

Build:

1. Vehicle management
2. Seat layout management
3. Departure vehicle assignment
4. Seat availability
5. Admin seat assignment

Customer live seat selection comes later.

---

# 20. Later Booking Flow

After the core departure infrastructure is complete:

```text
Tour
 ↓
Departure
 ↓
Pricing
 ↓
Room option
 ↓
Passengers
 ↓
Transport seats
 ↓
Vehicle / seat assignment
 ↓
Hotel / room assignment
 ↓
Booking
 ↓
Payment
```

---

# 21. Payment Direction

Payment UI can later support:

* Booking Money
* Full Payment

Possible payment methods:

* bKash
* Rocket
* Nagad
* DBBL
* Cash

Payment method is **not part of the pricing model**.

---

# 22. Git Workflow

After each meaningful working milestone:

```bash
git status
git add .
git commit -m "Short description"
git push
```

Keep working checkpoints frequent.

Never commit:

* `.env`
* `.env.local`
* database passwords
* API secrets
* other credentials

---

# 23. Session Continuity Rule

At the beginning of a new development session:

1. Check the current GitHub repository.
2. Read this `PROJECT_STATUS.md`.
3. Inspect the actual current code.
4. Continue from the latest completed checkpoint.
5. Do not assume old conversation code is still current.

At the end of a significant session:

1. Update this file.
2. Commit it.
3. Push it to GitHub.

This file should remain short enough to be useful but detailed enough that another session can continue without reconstructing the project history.

---

# 24. Current Position

**We are here:**

```text
Project setup                    ✅
Database                         ✅
Prisma 8 contract setup         ✅
Database migrations             ✅
Departure management             ✅
Pricing schema                   ✅
Pricing GET API                 ✅
Pricing POST API                ✅
Pricing update                  ⏳ NEXT
Room option API                 ⏳
Admin pricing UI                ⏳
Vehicles & seats                ⏳
Booking flow                    ⏳
Payment                         ⏳
Customer-facing booking         ⏳
```

## NEXT ACTION

**Implement and test `DeparturePricing` update/upsert using the actual Prisma 8 contract API.**

Do not move to the UI until the pricing API is complete and tested.
