# Guarded finance review

CRFD-37 connects the existing immutable reversal model to a restricted operator
workflow. It is **review intake, not refund execution**. OD-007/OD-010 approval and
provider-backed refund acceptance remain separate launch requirements.

## Operator workflow

1. Use an approved finance/admin account with verified email and both Clerk
   sign-in factors verified within the last 15 minutes. Roles come from Curiofold's
   active database assignments, never editable Clerk metadata.
2. Open Account → Finance review, or `/operations/finance`. If assurance has
   expired, verify both factors again before retrying. No staff roles are granted
   by this screen or by an API request.
3. Enter the payment order UUID and choose a reason: customer request, duplicate
   purchase or payment issue. Use the order reference from the payment return
   journey or customer export/support correspondence; do not request card data.
4. Record the review. The server derives the full amount, currency and purchased
   credits from the fulfilled order. It rejects pending/canceled orders and
   overlapping requests exceeding that order's amount or credits.
5. A new case enters `manual_review` with policy approval explicitly required.
   The latest 50 reversal cases are shown, without identity emails or provider
   payloads. This screen cannot approve/execute a refund or adjust a wallet.

## Security and failure behavior

- The page, queue API and mutation independently require finance/admin and recent
  MFA. Database transactions recheck account state, verified email and active role
  assignments under locks; stale session roles cannot override deletion/revocation.
- `POST /api/internal/payment-reversals` requires an exact same-origin JSON
  request, a bounded `Idempotency-Key`, an order UUID and allowlisted reason only.
  Prices, credits, actor IDs and requested statuses are rejected as client input.
- An actor-scoped key replays the same result. Changed details conflict. A new key
  cannot bypass the per-order reservation limit. Network retries retain the key;
  refresh the queue before changing details after an uncertain outcome.
- Creation and policy-gate audit/outbox records commit atomically. A failed
  transaction leaves no partial case. Responses are private/no-store and failures
  expose a correlation ID, not database/provider details.
- No Stripe request, compensating ledger entry, credit-lot change, entitlement
  revocation or financial erasure occurs. Spent credits and retained financial
  evidence remain unchanged. Never tell a customer that a review means a refund
  has been paid. Do not use direct database edits to bypass this gate.

## Verification

`pnpm validate`, the isolated PostgreSQL 18 integration harness and the
three-engine `finance-review.spec.ts` cover authorization, revocation/deletion,
duplicate/concurrent requests, tampering/CSRF, audit evidence, financial
preservation, keyboard operation, axe and hydration. Browser fixture requests are
intercepted; they are not live staff-MFA or Stripe refund evidence. Fixture routes
are disabled in production builds regardless of their environment flag.
