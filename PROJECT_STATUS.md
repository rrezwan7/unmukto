# Unmukto Project Status

Last updated: 2026-10-05

## Project

Unmukto is a travel/tour booking website being developed for the user's uncle.

Reference website:
https://grihotagi.com/

Production/deployment:
https://unmukto.vercel.app/

Repository:
https://github.com/rrezwan7/unmukto

---

## Technology Stack

- Next.js 16.3.6
- React 19.2.8
- TypeScript 5
- PostgreSQL
- Prisma 8 RC
- Tailwind CSS 4
- shadcn/ui
- Vercel
- GitHub

---

## Current Development Status

### Project setup
- [x] Fresh Next.js project created
- [x] TypeScript configured
- [x] Tailwind CSS configured
- [x] shadcn/ui configured
- [x] GitHub repository created
- [x] Vercel deployment connected
- [x] Vercel successfully deploying latest commits

### Database

The Prisma 8 database contract has been designed and is currently implemented in:

`src/prisma/contract.prisma`

Current domain models include:

- User / roles
- Tour
- Itinerary
- Destination
- Departure
- Vehicle
- SeatLayout
- Seat
- DepartureVehicle
- PricingRule
- Hotel
- Room
- HotelStay
- Booking
- Passenger
- SeatAssignment
- RoomAssignment
- Payment
- BlogPost
- BlogCategory
- BlogTag
- BlogPostTag

Prisma contract generation is configured through `prisma.config.ts`.

Database client:
`src/prisma/db.ts`

### Current database design

The booking system is designed around:

- A Tour having multiple Departures
- Departure-specific pricing
- Adult / Child / Infant passenger categories
- Shared / Couple / Private room types
- Vehicle and seat-layout management
- Hotel stays
- Passenger-level seat assignment
- Passenger-level room assignment
- Booking/payment tracking

### Booking system
The booking/pricing system is being designed around tour departures.

Important concepts currently being considered/implemented:

- Departure
- Adult pricing
- Child pricing
- Infant pricing
- Room types
- Shared room
- Couple room
- Private room
- Departure-specific pricing
- Seat/capacity management

The final pricing rules must be confirmed before locking the database schema.

---

## Important Product Direction

The project should eventually support:

1. Tour listing
2. Tour details
3. Multiple departures for a tour
4. Departure-specific pricing
5. Different room types
6. Adult/child/infant pricing
7. Booking
8. Seat assignment
9. Eventually live seat selection
10. Couple/single-room pricing
11. Optional bus/vehicle information
12. Multiple hotels within a tour
13. Guide information
14. Blog/content section
15. Admin management

---

## Current Priority

Build the project without over-engineering.

The immediate goal is to deliver a working travel booking website.

Prioritize:

1. Correct database model
2. Tour/departure/pricing system
3. Booking flow
4. Admin functionality
5. Seat assignment
6. Customer-facing UI
7. Live seat selection later

Do not build advanced features before the core booking flow works.

---

## Current Task

Finalize and validate the booking/pricing data model before building the application UI.

The immediate focus is to verify the business rules for:

- Adult + Shared room
- Adult + Couple room
- Adult + Private room
- Child pricing
- Infant pricing
- Whether child/infant pricing depends on room type
- Whether duplicate pricing combinations are allowed
- Currency and decimal handling
- Whether a departure can have incomplete pricing

Do not start building the full booking UI until these rules are settled.

---

## Next Steps

1. Validate the existing Prisma booking/pricing model against the confirmed business rules.
2. Make only the necessary schema changes.
3. Generate/verify the Prisma contract.
4. Verify the database/migrations locally.
5. Build the first admin functionality.
6. Build the customer-facing tour/departure experience.
7. Build the booking flow.
8. Add admin seat assignment.
9. Add live customer seat selection later.

---

## Development Workflow

Local development:

```bash
npm run dev