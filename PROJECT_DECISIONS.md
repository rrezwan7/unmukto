
# Unmukto Project Decisions

This file records important decisions made during development.

Do not reverse an existing decision without discussing the consequences first.

---

## 1. Project Approach

### Decision
Build the project first and learn/refactor progressively.

### Reason
The project has a real delivery requirement, so excessive learning before implementation should not delay delivery.

---

## 2. Reference Website

### Decision
Use the following website as the primary visual/product reference:

https://grihotagi.com/

### Important
The goal is not to blindly copy the site.

Use it to understand:

- Information architecture
- Tour presentation
- Booking experience
- Pricing presentation
- Travel website UX

---

## 3. Framework

### Decision
Use Next.js App Router.

### Current version
Next.js 16.x

### Important
Check the project's current version before using documentation or generating code. Do not automatically apply older Next.js patterns.

---

## 4. Database

### Decision
Use PostgreSQL.

---

## 5. ORM

### Decision
Use Prisma.

Current project uses Prisma 8 RC.

### Important
Prisma 8 has breaking/new conventions compared with older Prisma versions.

Always inspect the project's existing Prisma configuration before changing database code.

---

## 6. Styling

### Decision
Use Tailwind CSS.

Use shadcn/ui components where appropriate.

---

## 7. Deployment

### Decision
Use Vercel for deployment.

GitHub is the source-control repository.

---

## 8. Booking Architecture

A tour can have multiple departures.

Pricing may differ between departures.

Therefore pricing should not be treated as a single static price attached only to the tour.

---

## 9. Room Types

The booking system needs to account for room type.

Current room concepts:

- Shared room
- Couple room
- Private room

Final implementation must support the actual business rules rather than assuming every room type has the same pricing logic.

---

## 10. Passenger Types

The booking system needs to distinguish:

- Adult
- Child
- Infant

Child/infant pricing and whether room types affect their pricing must follow the final business rules.

---

## 11. Seat Management

### Decision
Implement admin-side seat assignment first.

Live customer seat selection will be implemented later.

### Reason
Admin seat assignment is required for the initial operational workflow and is simpler to establish first.

---

## 12. Vehicle Information

Vehicle/bus information may be associated with a departure.

The system should remain flexible enough to support this without unnecessarily coupling the booking system to a single vehicle type.

---

## 13. Hotels

A tour may use multiple hotels.

Do not design the system assuming one hotel per tour forever.

---

## 14. Guide Information

Tours/departures should eventually support guide information.

---

## 15. Blog

A blog/content section is planned for the website.

It is not part of the first core booking milestone unless required.

---

## 16. Development Philosophy

Prefer:

- Simple
- Maintainable
- Understandable
- Incremental

Avoid:

- Premature abstraction
- Over-engineering
- Building future features before current requirements
- Large architectural changes without need

---

## 17. AI Coding

AI can generate implementation code when appropriate.

However, generated code must be checked against:

- Existing project structure
- Current framework versions
- Existing database schema
- Existing conventions
- Deployment requirements

Do not blindly replace working code with generated alternatives.

---

## 18. Source of Truth

Priority order:

1. Current repository code
2. Database schema/migrations
3. This decision file
4. Project status
5. Conversation history
6. General assumptions

If conversation history conflicts with the current repository, inspect the repository before making changes.