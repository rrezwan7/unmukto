# 0001 — Bootstrap operator authentication

Date: 2026-10-12 (Bangladesh)
Status: implemented locally; deployment credentials and live OAuth verification pending.

## Context

The existing admin pages and management APIs have no session or authorization
checks. The booking database is still under review and has no real customer data.
Introducing a custom password/login system now would add credential handling
before customer identity requirements are settled.

## Decision

Use Auth.js with GitHub OAuth for initial operator access. Allow only explicitly
configured immutable numeric GitHub account IDs. Use encrypted eight-hour JWT
sessions; recheck the allowlist for every protected operation. Protect each data
page and route handler before database access, as well as the shared admin layout.
Require matching request origins for management mutations. Keep authentication
and database modules server-only.

Pin `next-auth@5.0.0-beta.32` as the documented App Router integration, accepting
its prerelease status explicitly and checking upgrades deliberately. The existing
Prisma release candidate is unchanged. No customer authentication is added.

## Consequences

Operators need a GitHub account and a configured OAuth App. Credentials must be
installed separately for local, staging and production environments. Access fails
closed without configuration. OAuth accounts are not yet linked to `User`; future
audit/booking integration must add a deliberate mapping. Customer login and richer
staff roles remain future work. Existing catalog APIs are currently management
APIs; future public catalog reads will have separate publication-filtered queries.

Removing an ID revokes its sessions on the next protected request; rotating the
secret revokes all sessions. Revocation takes effect when updated environment
configuration is deployed, not merely when settings are edited in a hosting panel.

## Validation

Policy tests and real HTTP tests exercise denial of anonymous, invalid, expired,
and non-admin sessions, origin checks, and an authorized admin page. Synthetic
sessions are restricted to tests. They do not verify GitHub's live OAuth exchange
or database-backed CRUD, which require configured external services.
