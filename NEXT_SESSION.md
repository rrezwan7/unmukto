# Next ChatGPT Session

## Project

Unmukto travel booking website.

GitHub:
https://github.com/rrezwan7/unmukto

Reference:
https://grihotagi.com/

Production:
https://unmukto.vercel.app/

---

## Stack

- Next.js 16.3.6
- TypeScript
- PostgreSQL
- Prisma 8 RC
- Tailwind CSS 4
- shadcn/ui
- Vercel

---

## Read These First

1. `PROJECT_STATUS.md`
2. `PROJECT_DECISIONS.md`
3. `AGENTS.md`
4. Existing Prisma/schema/migration files
5. Relevant files under `src/`

---

## Current Task

Validate the existing Prisma booking/pricing model against the actual business rules before building the booking UI.

The current contract already contains Tour, Departure, PricingRule, Booking, Passenger, RoomType, PassengerType, Vehicle, Seat, Hotel and related models.

---

## What We Just Finished

- Created the Next.js project.
- Configured TypeScript, Tailwind CSS and shadcn/ui.
- Connected GitHub and Vercel.
- Set up PostgreSQL.
- Set up Prisma 8 RC using the contract-based architecture.
- Created the initial comprehensive travel-booking data contract.
- Added project continuity documentation:
  - PROJECT_STATUS.md
  - PROJECT_DECISIONS.md
  - NEXT_SESSION.md

---

## What To Do Next

1. Review `src/prisma/contract.prisma`.
2. Validate the pricing rules with the business requirements.
3. Identify any schema changes required.
4. Generate the Prisma contract and verify the database.
5. Only then begin implementing the application UI/admin workflow.

---

## Important Constraints

- Do not redesign existing architecture unnecessarily.
- Check the existing code before creating new files.
- Respect the existing Prisma 8 setup.
- Do not use old Next.js patterns without checking compatibility.
- Keep the implementation simple and production-oriented.
- Test changes before considering the task complete.

---

## Last Known Good State

- Local development works: YES
- Production deployment works: YES
- Database setup: YES
- Prisma contract: implemented
- Customer-facing UI: not yet implemented
---

## Session Handoff

Before ending a development session:

1. Update `PROJECT_STATUS.md`.
2. Record any important decisions in `PROJECT_DECISIONS.md`.
3. Update this file with the exact next task.
4. Commit and push everything to GitHub.