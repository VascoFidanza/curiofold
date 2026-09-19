# ADR-0007 — Append-only credit ledger and entitlement invariants

**Status:** Accepted
**Date:** 2026-09-19

## Context

Credits and Story ownership are money-sensitive and must remain correct under retries, concurrency, refunds and support corrections.

## Decision

Use an append-only wallet ledger, transactionally maintained balance projection, purchase-provenance credit grants, FIFO spend allocations and a unique user/Story entitlement. Unlock locks the wallet/grants and creates debit plus entitlement atomically. Reversals are compensating entries.

## Alternatives considered

- A mutable credits integer.
- Provider payment history as the ledger.
- Eventual entitlement creation after debit.

## Consequences

The model is auditable and reconcilable but requires explicit transactions, concurrency tests and periodic invariant checks.
