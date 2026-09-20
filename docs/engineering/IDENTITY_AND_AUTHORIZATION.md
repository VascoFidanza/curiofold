# Identity and authorization boundary

## Purpose

Clerk authenticates people and manages browser sessions. Curiofold does not accept provider metadata as authorization truth: PostgreSQL owns account state, verified-email projection, staff role assignments and the lifecycle evidence used by policy decisions.

This boundary is intentionally useful before provider credentials exist. Public browsing continues when Clerk is unavailable; protected resources return an explicit no-store `503`, and no development bypass identity is created.

## Request flow

1. Next.js 16 `proxy.ts` attaches Clerk session state only when both development keys are configured. It does not authorize access.
2. Code adjacent to a protected resource calls `requireAuthorizationContext()`.
3. A valid Clerk user and session are required. Anonymous requests fail with `401`.
4. The provider subject is idempotently linked to the internal `users` row.
5. Disabled or pending-deletion accounts fail closed independently of the provider session.
6. Active, unrevoked staff assignments are loaded from PostgreSQL.
7. Framework-independent policy decides the requested capability.

`GET /api/v1/session` is the walking-skeleton proof surface. It returns only a minimal capability projection, never the provider subject, session identifier, internal user identifier or staff-role list.

## Authorization policy

- Active accounts may inspect their account and read already-owned Stories, subject to the entitlement check added by CRFD-19.
- Unlock and checkout entry points additionally require the database-owned verified-email projection.
- Staff capabilities are deny-by-default and role-specific.
- Every privileged staff capability requires a verified email plus first- and second-factor verification within 15 minutes.
- Account state overrides every role. A disabled account cannot retain access through a stale provider session.
- Clerk organization roles or user-editable metadata do not grant Curiofold privileges.

The initial roles are `editor`, `publisher`, `support`, `finance` and `admin`. The partial unique database index permits only one active assignment of a role to a user while retaining revoked history. Grant/revoke operator workflows and their audit writers belong to later operational milestones; direct database editing is not an ordinary support workflow.

## Lifecycle projection

`POST /api/webhooks/clerk` follows [Clerk's verified webhook contract](https://clerk.com/docs/guides/development/webhooks/syncing) and verifies Standard Webhook signatures before interpreting any payload. Only `user.created`, `user.updated` and `user.deleted` are projected. Curiofold uses the signed Svix `svix-id` as the delivery idempotency key and `svix-timestamp` as the fallback event time. It stores only the provider event identifier, event type, subject, timestamp and processing result; raw provider payloads and email addresses are not retained.

Lifecycle writes are serialized per provider subject with a PostgreSQL transaction advisory lock. Provider event IDs are unique, so retries are idempotent. Older updates are recorded as ignored and cannot reactivate an account after a newer deletion. Just-in-time account linkage handles the case where a valid session arrives before its webhook, but it never re-enables a disabled account.

## Safe navigation

Post-authentication return paths are parsed against a fixed Curiofold origin and accepted only for allowlisted product destinations. Absolute URLs, protocol-relative URLs, backslash variants, recursive auth routes and unknown paths fall back to `/`. URL fragments are discarded. This validation runs before a value is passed to Clerk UI components, and the sanitized destination uses Clerk's force-redirect option so an original `redirect_url` query cannot take precedence.

## Degraded operation

- No Clerk keys: public pages and liveness remain available; sign-in/account surfaces explain that identity is unavailable; protected APIs return `503`.
- Valid Clerk session but unavailable database: protected work fails and the normal error/observability boundary captures it; public browsing continues.
- Anonymous request: protected data returns `401`; the account page offers the local sign-in route.
- Disabled internal account: protected data returns `403` even if Clerk still presents a valid session.

No route treats Proxy, client components or a successful browser redirect as sufficient authorization.

## Remaining live gate

CRFD-13 cannot be Done until a development Clerk instance is connected and the following are evidenced in protected preview:

- email-code sign-in and account creation;
- safe return to an originating Story;
- session expiry, logout and revocation;
- signed webhook creation/update/deletion delivery and retry;
- disabled-account denial;
- allowed-origin behavior across the stable preview domain;
- provider UI accessibility and visual acceptance.

Production keys, production domains and live account policy remain out of scope.
