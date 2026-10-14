# Account deletion implementation checkpoint

CRFD-72 is in progress on `codex/crfd-72-deletion-lifecycle`.

The API requires same-origin JSON, exact DELETE confirmation, verified email and first-factor verification within 15 minutes. Acceptance atomically sets pending_deletion and writes audit/outbox intent. Existing authorization rejects pending accounts. No financial records or unused credit value are erased.

The bearer-protected POST `/api/internal/account-deletions` processes ten jobs per invocation. Provider failures retain durable work; ten attempts require operator investigation. Clerk banning precedes active-session revocation. Successful processing removes reading history and revokes staff assignments, retaining identity linkage for financial review and restored-data suppression. Permanent identity/financial erasure is not enabled.

Before merge: add route/UI security tests and status/retry integration; prove hosted PostgreSQL concurrency coverage; address in-flight account mutations; provide bounded provider calls/backoff and exhausted-job diagnostics; configure and verify scheduler execution; validate a disposable development identity end to end. Current UI reports acceptance/pending processing, not permanent deletion. Authenticated status after banning and deletion suppression during restore still require implementation. Do not mark the issue Done or merge this checkpoint.

CRFD-73 recovery rehearsal has not started. Preserve the current Preview database and operator account during testing.
