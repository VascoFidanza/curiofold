# ADR-0008 — Stripe Checkout with asynchronous fulfilment

**Status:** Accepted, subject to OD-007
**Date:** 2026-09-19

## Context

Curiofold should minimize card-handling scope and remain correct when browser redirects, webhooks and provider retries arrive in any order.

## Decision

Use Stripe-hosted Checkout behind a payment adapter. Create an internal order first, use provider idempotency, persist signed webhook events uniquely and fulfil only from reconciled provider state. Browser redirects never issue credits.

## Alternatives considered

- Custom payment form.
- Merchant-of-record provider.
- Redirect-only fulfilment.

## Consequences

PCI and payment-UI scope are reduced. Legal/tax advice may replace Stripe with a merchant of record without changing the internal order/ledger contracts.
