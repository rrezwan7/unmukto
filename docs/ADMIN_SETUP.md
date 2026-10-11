# Admin sign-in setup

This milestone protects current management pages and APIs. It uses Auth.js
`next-auth@5.0.0-beta.32`, pinned explicitly, with GitHub OAuth and encrypted JWT
sessions lasting eight hours. This is a bootstrap identity system for operators;
it does not yet link an OAuth identity to the booking `User` table or implement
customer registration. The prerelease dependency must be monitored and updated
deliberately with integration checks.

## Local setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local` and fill its placeholders locally.
3. Create a GitHub OAuth App under your GitHub developer settings. Use
   `http://localhost:3000` as its homepage and
   `http://localhost:3000/api/auth/callback/github` as its callback URL.
4. Put its client ID and secret in `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`.
5. Generate `AUTH_SECRET` locally: `openssl rand -base64 32`.
6. Set `ADMIN_GITHUB_IDS` to the numeric GitHub account IDs authorized to manage
   Unmukto, separated by commas. Find an account ID at
   `https://api.github.com/users/YOUR_USERNAME` in the `id` field. Usernames and
   email addresses are not accepted as IDs. No account is granted admin implicitly.
7. Set your local `DATABASE_URL` separately using your existing PostgreSQL setup.
8. Run `npm run dev` and open `/login`.

Do not send credentials in chat or commit environment files. The example file
contains placeholders only. Removing an account ID from the allowlist blocks
that account's existing sessions on subsequent requests. Rotate `AUTH_SECRET`
to invalidate all sessions.

## Vercel / staging

Configure these environment variables in the appropriate Vercel environment.
Use a separate OAuth App for staging and production, each with its exact origin
and `/api/auth/callback/github` URL. Set `AUTH_URL` to that environment's canonical
origin. Vercel is automatically recognized as a trusted host by Auth.js. Do not
enable `AUTH_TRUST_HOST` on an untrusted custom proxy without reviewing forwarded
headers. Use a stable staging domain; arbitrary preview domains need their own
OAuth callback configuration.

These APIs are management-only in this milestone, including GET requests. Future
public catalog APIs must be separate queries that filter published data.
Application POST requests require a matching `Origin` header in addition to the
verified session. Existing browser forms send this automatically.

## Checks

- `npm run lint`
- `npm run typecheck`
- `npm test` (unit policy checks and live Next.js access tests, using synthetic
  encrypted sessions and no real database or OAuth credentials)
- `npm run build`

After building, run `TEST_NEXT_MODE=start npm test` on a Unix shell to repeat the
same access checks against the production server. The test server binds only to
loopback and receives temporary test credentials. Both server modes have passed
the six checks in this milestone; lint, typecheck, and production build also pass.

Manual checks after credentials are configured: allowed GitHub sign-in, rejected
non-allowlisted sign-in, sign-out, allowlist removal with an existing session,
and authorized tour/departure operations against an isolated database. Automated
session fixtures do not prove the live GitHub OAuth exchange or database writes.
