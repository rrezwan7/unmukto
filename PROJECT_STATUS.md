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
- [x] PostgreSQL installed/configured locally
- [x] Prisma installed
- [x] Prisma PostgreSQL setup completed
- [x] Database connection configured
- [x] Initial database/migrations work completed
- [x] Tour model work started/completed
- [x] Itinerary model work started/completed

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

Update this section whenever work moves to a new task.

Current task:

[WRITE CURRENT TASK HERE]

---

## Next Steps

1. Finalize the booking/pricing data model.
2. Implement the required Prisma models.
3. Run migrations and verify the database.
4. Build the admin-side tour/departure/pricing management.
5. Build the customer-facing booking flow.
6. Add seat assignment.
7. Add live seat selection later.

---

## Development Workflow

Local development:

```bash
npm run dev