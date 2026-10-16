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

The same probe also checks unpublished account deletion jobs. It returns
`deletion_jobs_exhausted` at ten attempts, or `deletion_jobs_overdue` when cleanup
is more than fifteen minutes beyond its retry eligibility. This includes the
worker's exponential backoff (capped at one hour), avoiding alerts for legitimate
retry delays. Completed jobs awaiting legal retention review do not alarm.
For either code, Vasco should inspect the existing `accountcleanup` trigger and
redacted logs, Clerk availability and `account.deactivation_attempt` audit records.
Resolve the cause before an audited retry; never reactivate the account, erase
retained evidence or reset attempts blindly. No identities or job IDs are exposed.

| Code                 | Operator action                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `heartbeat_stale`    | No completed run within 15 minutes. Check enabled trigger, deployment/config and Neon logs; restore scheduling before replaying work.                              |
| `worker_failed`      | Inspect job `last_error_code`, provider availability and worker logs. Durable retries continue; never reset attempts blindly.                                      |
| `jobs_exhausted`     | Investigate the order and authoritative Stripe Session; resolve the underlying problem before an audited operator requeue. No automatic credit/entitlement repair. |
| `jobs_overdue`       | Work is over 15 minutes late beyond its due/lease time. Inspect scheduler, leases and database connectivity.                                                       |
| `wallet_discrepancy` | Run existing read-only `reconcileWallets` to obtain classified internal evidence. Escalate a financial-integrity incident; preserve records.                       |
| `audit_incomplete`   | Full bounded audit exceeded capacity. Increase/schedule cursor coverage deliberately before claiming full audit health.                                            |
| `worker_unavailable` | Database/worker dependency failed. Check configuration and provider telemetry; no exception payload is exposed.                                                    |

Nonproduction polling and actual DOWN/UP email delivery are verified below;
Vasco is the responding recipient. Production alert routing and response coverage
remain launch gates. Do not reuse a production alert credential in nonproduction.

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

## Alert delivery drill — 2026-10-16 (CRFD-75)

- UptimeRobot monitor **Curiofold Development Payment Operations** polls the
  existing health URL every five minutes; Vasco's verified email is the recipient.
- At 14:45:53 UTC, a controlled nonfinancial failure heartbeat was recorded using
  `recordPaymentOperationsRun`. The probe returned HTTP 503 / `worker_failed`.
  No payment, financial record or production resource was changed.
- Vasco confirmed receipt of the genuine DOWN email at **15:48 Portugal local
  time (14:48 UTC)**, reporting incident start **14:48:14 UTC** and HTTP 503.
  Earlier TEST emails are excluded from acceptance evidence.
- The real scheduled worker recovered at **14:51:01 UTC**, followed by another
  healthy run at 14:52:01. The probe independently returned HTTP 200 /
  `{"healthy":true,"codes":[]}` at 14:53:04 UTC.
- The temporary drill cadence was restored to enabled `*/5 * * * *`, with next
  run 14:55 UTC. Account cleanup scheduling was unchanged.
- Before/after: 10 payment orders, 6 ledger entries, 4 credit grants, 5 entitlements
  and 104 aggregate credits. Ordered full-row MD5 fingerprints were identical:
  orders `d275ff39407a4aff13205de5d619474d`, ledger
  `65bfa62bfde279cdb6f1bc10220a76f2`, entitlements
  `c6a845a227a6a82de24d02dec0c97b57`.
- Vasco confirmed receipt of the genuine UP email at **15:53 Portugal local time
  (14:53 UTC)**, reporting incident resolution **14:53:18 UTC**. Both operational
  notifications were delivered, not TEST messages. The observed incident lasted
  5 minutes 4 seconds. This completes nonproduction alert-delivery acceptance;
  it does not certify production routing or round-the-clock response coverage.
