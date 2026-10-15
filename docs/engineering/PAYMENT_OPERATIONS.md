# Nonproduction payment operations

CRFD-74 reuses the existing Stripe adapter, event inbox, transactional fulfilment,
retry/backoff and reconciliation jobs. No financial state is repaired by monitoring.

## Deployed boundary

- Neon project `bitter-hat-89380353`, branch `br-purple-forest-b1cah3ow`.
- Function `paymentoperations`, source `scripts/neon-payment-operations.ts`.
- Trigger `trigger-a4f13ccf-1979-46dc-b191-12a906d56ec8`, name
  `curiofold-payment-operations`, five-minute UTC cadence.
- Credentials live only in Neon Function environment management:
  `STRIPE_SECRET_KEY`, `CURIOFOLD_DATABASE_URL`, `CURIOFOLD_ENVIRONMENT`.
  The existing Sandbox key is reused. No new Stripe object or Vercel bypass exists.
- POST accepts only authenticated Neon schedule headers with matching payload/name.
  Production environment, live keys, unknown database endpoints and malformed
  configuration fail closed. The database connection explicitly verifies TLS.
- Each batch claims at most five jobs with a five-minute lease. Stripe reads have
  ten-second timeouts and no inline retries; durable job backoff owns retry policy.
  An interrupted process becomes reclaimable after lease expiry. Duplicate
  provider events only close a job when the authoritative order is terminal.

## Monitoring and response

Each successful invocation records a durable `operations.payment_reconciliation`
audit event. Wallet verification uses a read-only repeatable-read snapshot and
bounded pagination (1,000 wallets per run); an incomplete audit fails visibly.
Ordinary unpaid/pending Checkout sessions do not generate false provider alerts.

Read-only probe:
`https://br-purple-forest-b1cah3ow-paymentoperations.compute.c-5.eu-central-1.aws.neon.tech/health`

The probe intentionally exposes only `healthy` and bounded diagnostic codes,
never users, order identifiers, amounts, counts, provider payloads or credentials.
It cannot run reconciliation or alter data. Responses are uncached; unhealthy
state returns HTTP 503. Authenticated schedule runs also emit redacted logs.

| Code                 | Operator action                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `heartbeat_stale`    | No completed run within 15 minutes. Check enabled trigger, deployment/config and Neon logs; restore scheduling before replaying work.                              |
| `worker_failed`      | Inspect job `last_error_code`, provider availability and worker logs. Durable retries continue; never reset attempts blindly.                                      |
| `jobs_exhausted`     | Investigate the order and authoritative Stripe Session; resolve the underlying problem before an audited operator requeue. No automatic credit/entitlement repair. |
| `jobs_overdue`       | Work is over 15 minutes late beyond its due/lease time. Inspect scheduler, leases and database connectivity.                                                       |
| `wallet_discrepancy` | Run existing read-only `reconcileWallets` to obtain classified internal evidence. Escalate a financial-integrity incident; preserve records.                       |
| `audit_incomplete`   | Full bounded audit exceeded capacity. Increase/schedule cursor coverage deliberately before claiming full audit health.                                            |
| `worker_unavailable` | Database/worker dependency failed. Check configuration and provider telemetry; no exception payload is exposed.                                                    |

External polling/paging delivery and a named responding operator remain explicit
launch gates. HTTP failure signals and logs are not a claim that a human received
an email/page. Do not reuse a production alert credential in nonproduction.

## Live evidence — 2026-10-15

- Before enabling the trigger: public spoofed POST returned 401; missing durable
  heartbeat returned 503 / `heartbeat_stale`.
- Actual authenticated 11:22 UTC invocation re-read five existing Stripe Sandbox
  Checkout Sessions and closed their jobs. Health became HTTP 200 with no codes.
- Financial baseline and first-run comparison: 6 ledger entries, 4 credit grants,
  5 entitlements and 104 total credits unchanged. Five reconciliation events were
  processed; no new payment, grant, debit or entitlement was created.
- At 11:23 UTC a clearly scoped nonfinancial operational alarm drill wrote a
  failure heartbeat through the repository function. The actual probe returned
  503 / `worker_failed`. The actual 11:25 UTC schedule recovered to HTTP 200 /
  healthy, completed the remaining five jobs and left all baseline financial
  totals unchanged. Ten reconciliation events were processed and ten jobs
  completed. No new payment was created. Cadence is now five minutes.

CI covers duplicate terminal/nonterminal events, provider failures, safe request
authentication/configuration, bounded/consistent audits, durable heartbeat
failure/recovery/staleness and overdue/exhausted job diagnostics on PostgreSQL 18.
Recovery limitations in `RECOVERY.md` remain launch gates, not waived by this work.
