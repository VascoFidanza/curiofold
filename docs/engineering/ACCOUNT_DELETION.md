# Account deletion implementation checkpoint

CRFD-72 is in progress on `codex/crfd-72-deletion-lifecycle`.

The API requires same-origin JSON, exact DELETE confirmation, verified email and first-factor verification within 15 minutes. Acceptance atomically sets pending_deletion and writes audit/outbox intent. Existing authorization rejects pending accounts. No financial records or unused credit value are erased.

The bearer-protected POST `/api/internal/account-deletions` processes ten jobs per invocation. Provider failures retain durable work; ten attempts require operator investigation. Clerk banning precedes active-session revocation. Successful processing removes reading history and revokes staff assignments, retaining identity linkage for financial review and restored-data suppression. Permanent identity/financial erasure is not enabled.

Before merge: add route/UI security tests and status/retry integration; prove hosted PostgreSQL concurrency coverage; address in-flight account mutations; provide bounded provider calls/backoff and exhausted-job diagnostics; configure and verify scheduler execution; validate a disposable development identity end to end. Current UI reports acceptance/pending processing, not permanent deletion. Authenticated status after banning and deletion suppression during restore still require implementation. Do not mark the issue Done or merge this checkpoint.

CRFD-73 recovery rehearsal has not started. Preserve the current Preview database and operator account during testing.

## Nonproduction scheduler — 2026-10-14

The existing Frankfurt Neon branch `br-purple-forest-b1cah3ow` now hosts `accountcleanup`, built from `scripts/neon-account-cleanup.ts`. A five-minute schedule named `curiofold-account-cleanup` exists but is disabled until credentials and live acceptance are verified. Trigger ID: `trigger-83b0330d-0f82-495d-a090-f453c840a13b`.

The handler accepts only Neon-authenticated schedule deliveries with matching invocation ID/name. A live spoofed trigger-header POST returned 401. It fails closed without the explicit nonproduction setting, a development Clerk key and the curiofold database URL. Deployment completed; scheduled cleanup execution is not yet verified.

Vercel's existing sensitive Preview `CLERK_SECRET_KEY` cannot be read back through the connector. The operator must provide the existing development key securely before the Neon worker can be enabled. No replacement key, production credential, public bypass or protection change is required. Financial retention cleanup remains gated.
