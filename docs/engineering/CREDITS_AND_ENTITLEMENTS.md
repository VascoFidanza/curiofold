# Credits, Wallets and Entitlements

## Purpose

This document records the implemented financial-state boundary for Curiofold credits. ADR-0007 remains the decision authority; this document describes the current schema and command behavior.

The wallet is provider-independent. Stripe, another payment processor, promotional tooling and guarded support operations may request a grant later, but none may write wallet tables directly.

## Accounting invariants

1. `wallet_entries` is the source of accounting truth and is append-only.
2. `wallet_accounts.balance_cached` equals the sum of that wallet's signed ledger deltas.
3. A credit-grant operation creates exactly one credit lot and one positive ledger entry.
4. A globally namespaced operation key identifies one semantic command. Reusing it with different user, source, reference or units fails closed.
5. Credits are bounded positive integers. Currency and payment amounts are not represented as credits.
6. A new Story unlock creates exactly one debit, one FIFO lot allocation and one active entitlement in the same transaction.
7. An already-owned Story is an idempotent success and never debits again.
8. Concurrent unlocks cannot spend the same credit twice.
9. Original credit-lot provenance is immutable. Only its remaining-unit projection and update timestamp may change during spend/reversal work.
10. Financial history is corrected with compensating entries, never edits or deletion.

These invariants are protected through typed commands, PostgreSQL checks and unique indexes, row locks, foreign keys, restricted mutations and real-PostgreSQL concurrency tests.

## Storage model

### `wallet_accounts`

There is at most one wallet per internal user. The row stores a transactionally maintained integer balance and monotonically increasing version. Creation is idempotent. The version supports safe cache/UI invalidation and later optimistic boundaries; it is not an accounting source.

The balance is not constrained to remain nonnegative at schema level because OD-010 may require a negative balance after a refund or chargeback. Ordinary spend commands will still fail before overspending and will lock the wallet first.

### `credit_grants`

Each row is a credit lot with:

- the owning wallet;
- granted and remaining integer units;
- `seed`, `payment`, `promotional`, `support` or `correction` provenance;
- a safe provider/domain reference, where one exists;
- a globally unique, namespaced operation key;
- actor, reason and timestamps.

Provider payloads, email addresses, card data and other personal data do not belong in this table. A database trigger rejects deletion or changes to original provenance. Later FIFO spend allocation may update only the remaining-unit projection.

### `wallet_entries`

Each signed entry records its resulting wallet balance, monotonically increasing wallet version, operation key, type, reason, actor and optional source grant. Grant entries must be positive and reference one unique credit lot. Spend entries must be negative and are associated with lots through explicit FIFO allocations. The wallet/version pair is unique, giving reconciliation a deterministic accounting order even when event timestamps are equal or backdated.

A database trigger rejects every update and delete. The application exposes no generic wallet CRUD interface.

### `credit_spend_allocations`

Each debit records which credit lot funded it. Allocations are append-only, positive and unique per ledger-entry/lot pair. Story unlock currently consumes one unit from the oldest spendable lot by grant time and stable identifier. This provenance allows later refund and reversal policy to distinguish unspent from spent credits without rewriting history.

### `unlock_operations`

Every successful or already-owned unlock request stores an immutable result under one globally unique operation key. The record binds the caller, Story, entitlement, optional debit entry and canonical post-operation wallet state. Reusing the key for another user or Story fails closed.

### `payment_orders`

Payment orders are internal, provider-independent commercial records. Each order stores the owning user, user-scoped idempotency key, safe relative return path, state, and an immutable snapshot of the server-selected pack key, credits, integer minor-unit amount and ISO currency. Optional provider identifiers are uniquely constrained within their provider.

The database rejects deletion and changes to the order's user, idempotency key, commercial snapshot, return path or creation timestamp. Later provider processing may only add provider correlation and advance the explicit state machine. Browser redirects are not a transition source and can never fulfil an order.

No live pack catalogue is committed while OD-003 remains open. A future authenticated checkout boundary will accept only a pack key and will resolve its commercial values from server-owned configuration before calling `createPaymentOrder`.

Allowed provider-evidence transitions are:

- `pending` → `checkout_created` or `canceled`;
- `checkout_created` → `payment_pending`, `fulfilled` or `canceled`;
- `payment_pending` → `fulfilled` or `canceled`;
- `fulfilled` and `canceled` are terminal.

The provider port exposes only normalized checkout commands and provider-order snapshots. Stripe-specific SDK objects and webhook payloads must not enter the domain or database contracts.

## Idempotent grant transaction

`grantCredits` performs this sequence in one PostgreSQL transaction:

1. Validate positive bounded integer units, source, reason, source reference and operation key.
2. Create the user's wallet if absent.
3. Lock the wallet row with `FOR UPDATE`.
4. Insert the credit lot using the operation-key unique constraint.
5. If the operation already exists, verify its semantic fields and return the existing grant plus current canonical balance.
6. If it is new, calculate the next balance and reject PostgreSQL integer overflow.
7. Append one grant ledger entry.
8. Update the cached balance and version.
9. Append a minimized audit event.
10. Commit once.

Concurrent duplicate calls serialize and return the same grant without double credit. A conflicting replay rolls back without changing balance.

Operation keys must be deterministic and namespaced at their origin, for example `payment:<internal-order-id>`, `promotion:<campaign-id>:<user-id>` or `support:<approved-adjustment-id>`. Secrets and raw provider payloads are prohibited.

## Atomic Story unlock transaction

`unlockStoryWithCredit` performs this sequence in one PostgreSQL transaction:

1. Normalize the operation key and return its stored result when it already belongs to the same user and Story.
2. Return an immutable `already_owned` result when an active entitlement already exists.
3. Require at least one published localization; draft-only or unknown Stories fail closed.
4. Lock the user's wallet row with `FOR UPDATE`.
5. Recheck the operation and entitlement after obtaining the lock, so a concurrent winner is observed before balance is assessed.
6. Require one available credit and lock the oldest spendable credit lot.
7. Create the entitlement and entitlement event.
8. Append one `-1` spend ledger entry and its FIFO allocation.
9. Decrement the lot's remaining units and update the wallet projection/version.
10. Append minimized audit evidence and the immutable operation result.
11. Commit once.

The `POST /api/v1/story-unlocks` boundary requires an authenticated, verified-email session, a valid `Idempotency-Key`, same-origin mutation, and an exact `{ "storyId": "<uuid>" }` body. It returns only the entitlement identifier, outcome and canonical wallet projection. Insufficient credits and operation-key conflicts are explicit `409` responses; unavailable Stories return `404` without revealing draft state.

## Public and privileged boundaries

There is currently no browser route for granting credits. Only the server-side commerce module exports the grant command. Later callers must enforce their own authority before entering it:

- a fulfilled payment order through an idempotent provider-event processor;
- a versioned promotional rule;
- a finance/admin action with recent MFA, a reason and audit evidence;
- a synthetic seed in isolated nonproduction environments.

The customer-safe balance/history projection is available only through authenticated `GET /api/v1/wallet`. It returns the canonical integer balance, wallet version and cursor-paginated transactions. Transaction rows contain only a public kind, signed credit quantity, timestamp, safe source category and optional Story identifier. Operation keys, provider references, reasons, actors, identity data and audit metadata never cross this boundary. Responses are private and `no-store`.

## Reconciliation and operational failure boundary

`reconcileWallets` is a read-only, wallet-ID-paginated audit over immutable accounting and ownership records. It independently classifies:

- cached balance versus ledger-sum drift;
- missing or noncontiguous wallet versions;
- per-entry running-balance drift;
- grant-to-ledger and grant-remaining/allocation drift;
- spend-to-allocation and cross-wallet allocation drift;
- unlock-operation-to-debit/entitlement drift;
- unlock-sourced entitlements without their originating operation.

The result contains opaque internal identifiers and integer expected/actual evidence, but no personal or provider data. `assertWalletsReconciled` converts any nonhealthy batch into a stable operational failure suitable for the later scheduler and alerting integration. Neither function repairs or otherwise mutates financial state. Investigation and compensating corrections require a separate guarded workflow.

## Validation evidence

The PostgreSQL 18 integration suite exercises:

- wallet creation from zero;
- concurrent duplicate grants;
- mismatched idempotency replay;
- multiple provenance sources;
- balance-to-ledger equality;
- lot provenance and remaining units;
- append-only ledger enforcement;
- credit-lot deletion protection;
- FIFO allocation of an unlock debit;
- concurrent duplicate-key idempotency;
- concurrent different-key unlocks of the same Story with one available credit;
- already-owned unlock behavior without a second debit;
- cross-user operation-key conflict behavior;
- insufficient-credit rollback without entitlement or operation creation;
- append-only allocation and immutable unlock-operation enforcement;
- deterministic cursor pagination and user-isolated wallet history;
- absence of operation keys, reasons, actors and provider references from customer history;
- a healthy multi-wallet reconciliation result;
- deliberate classification of every current reconciliation discrepancy type;
- an operational failure signal without automatic mutation;
- invalid zero and fractional/negative units at the domain boundary.
- concurrent idempotent payment-order creation and conflicting replay rejection;
- user-isolated payment-order retrieval and safe return-path fallback;
- database rejection of invalid commercial snapshots and mutation/deletion of immutable order history;
- explicit payment-state transition policy that rejects regressions and fulfilment without provider/reconciliation evidence.

The migration graph must apply cleanly to an empty database and upgrade from every committed predecessor. No live payment provider or production database is required for this foundation.

## Remaining work and decisions

- Milestone 3.2 continues with hosted Checkout creation, verified event fulfilment and stale-order reconciliation. A fulfilled provider order maps to the existing grant command.
- Milestone 3.3 adds compensating reversals and guarded operations.
- OD-010 determines spent-credit treatment after refund or chargeback.
- OD-011 determines the final payment-provider model.

Scheduled reconciliation and alert delivery remain an operations milestone. Provider orders and reversals may add commands and entry types, but they must extend the classifier and must not weaken or rewrite the immutable history established here.
