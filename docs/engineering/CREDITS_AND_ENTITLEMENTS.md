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
6. Original credit-lot provenance is immutable. Only its remaining-unit projection and update timestamp may change in later spend/reversal work.
7. Financial history is corrected with compensating entries, never edits or deletion.

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

Each signed entry records its resulting wallet balance, operation key, type, reason, actor and optional source grant. Grant entries must be positive and reference one unique credit lot. Future spend entries must be negative and are associated with lots through explicit FIFO allocations.

A database trigger rejects every update and delete. The application exposes no generic wallet CRUD interface.

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

## Public and privileged boundaries

There is currently no browser route for granting credits. Only the server-side commerce module exports the grant command. Later callers must enforce their own authority before entering it:

- a fulfilled payment order through an idempotent provider-event processor;
- a versioned promotional rule;
- a finance/admin action with recent MFA, a reason and audit evidence;
- a synthetic seed in isolated nonproduction environments.

The customer-safe balance projection contains only available integer credits and wallet version. Transaction history, unlock debit, FIFO allocations, reconciliation and reversals are delivered by CRFD-23/CRFD-22 and later Project 3 milestones.

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
- invalid zero and fractional/negative units at the domain boundary.

The migration graph must apply cleanly to an empty database and upgrade from every committed predecessor. No live payment provider or production database is required for this foundation.

## Remaining work and decisions

- CRFD-23 adds FIFO allocation, atomic one-credit Story unlock and entitlement creation.
- CRFD-22 adds reconciliation and customer-safe transaction history.
- Milestone 3.2 maps fulfilled provider orders to this grant command.
- Milestone 3.3 adds compensating reversals and guarded operations.
- OD-010 determines spent-credit treatment after refund or chargeback.
- OD-011 determines the final payment-provider model.

Those decisions may add commands and entry types, but they must not weaken or rewrite the immutable history established here.
