# Account deletion lifecycle

CRFD-72 implementation and nonproduction acceptance evidence. Permanent financial/identity erasure remains gated by approved retention and unresolved-value policies.

The API requires same-origin JSON, exact DELETE confirmation, verified email and first-factor verification within 15 minutes. Acceptance atomically sets pending_deletion and writes audit/outbox intent. Existing authorization rejects pending accounts. No financial records or unused credit value are erased.

The bearer-protected POST `/api/internal/account-deletions` processes ten jobs per invocation. Provider failures retain durable work; ten attempts require operator investigation. Clerk banning precedes active-session revocation. Successful processing removes reading history and revokes staff assignments, retaining identity linkage for financial review and restored-data suppression. Permanent identity/financial erasure is not enabled.

Order creation, unlock and progress transactions take the same account lock as deletion, rejecting mutations after acceptance. Durable retries back off exponentially up to one hour, stop at ten attempts, and expose operator_review through an opaque HttpOnly receipt. Provider waits are bounded. Interrupted transactions leave work retryable; repeated provider effects are idempotent. Account status remains available after session revocation and reload, without exposing identity or financial data.

CRFD-72 merged in PR #61 as `319b749` after all seven hosted checks passed, including PostgreSQL 18 integration. The canonical Preview is READY and account/wallet acceptance passed. CRFD-73 actual snapshot restore and Preview rollback evidence is recorded in `RECOVERY.md`; production disaster recovery remains a separate gate.

## Nonproduction scheduler — 2026-10-15

The existing Frankfurt Neon branch `br-purple-forest-b1cah3ow` hosts `accountcleanup`, built from `scripts/neon-account-cleanup.ts`. The five-minute schedule `curiofold-account-cleanup` is enabled. Trigger ID: `trigger-83b0330d-0f82-495d-a090-f453c840a13b`.

The handler accepts only Neon-authenticated schedule deliveries with matching invocation ID/name. A live spoofed trigger-header POST returned 401. It fails closed without the explicit nonproduction setting, a development Clerk key and the curiofold database URL. Credentials are stored in Function environment management, never the bundle.

Vercel's sensitive Preview key could not be read back. The operator supplied the existing development key in ignored local configuration; it was securely deployed into Function environment management. No replacement key, production credential, public bypass or protection change was made.

2026-10-15 live evidence: authenticated disposable Clerk development identity requested deletion through the feature Preview confirmation UI. Account reload immediately denied access. Neon scheduled invocation at 08:52 UTC completed one job with zero failures; both Clerk sessions were revoked and the identity was banned. Progress rows changed from one to zero. Wallet balance stayed five synthetic seed credits; one ledger entry and one active entitlement were preserved. Status after reload reported retention review. These credits/ownership were explicitly synthetic fixtures, not actual paid purchases; existing paid-order preservation and failure/concurrent retry behavior also have hosted PostgreSQL coverage. Schedule returned from temporary one-minute acceptance cadence to five minutes. Feature-branch-only NEXT_PUBLIC_APP_URL trusts its explicit alias; canonical configuration is unchanged.

Recovery must preserve deletion markers and reapply provider restrictions before reopening access. The 2026-10-15 restore preserved the pending-deletion marker and Clerk restrictions. An older recovery point still requires comparison/reapplication of later deletion requests; no restored database may be exposed merely because its restore completed.
