import { desc, eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

type Database = NodePgDatabase<typeof schema>
export type PaymentOperationsCode =
  | 'worker_failed'
  | 'wallet_discrepancy'
  | 'audit_incomplete'
  | 'jobs_exhausted'
  | 'jobs_overdue'
  | 'heartbeat_stale'
  | 'deletion_jobs_exhausted'
  | 'deletion_jobs_overdue'

export async function recordPaymentOperationsRun(
  database: Database,
  codes: readonly PaymentOperationsCode[],
  now = new Date(),
) {
  await database.insert(schema.auditEvents).values({
    action: 'operations.payment_reconciliation',
    targetType: 'payment_operations',
    createdAt: now,
    metadata: { codes },
  })
}

export async function readPaymentOperationsHealth(
  database: Database,
  now = new Date(),
) {
  const [run] = await database
    .select({
      createdAt: schema.auditEvents.createdAt,
      metadata: schema.auditEvents.metadata,
    })
    .from(schema.auditEvents)
    .where(eq(schema.auditEvents.action, 'operations.payment_reconciliation'))
    .orderBy(desc(schema.auditEvents.createdAt))
    .limit(1)
  const jobs = await database.execute<{
    retryFailure: boolean
    exhausted: boolean
    overdue: boolean
    deletionExhausted: boolean
    deletionOverdue: boolean
  }>(sql`
    SELECT
      EXISTS (SELECT 1 FROM payment_reconciliation_jobs j
        WHERE j.status='pending'
        AND j.last_error_code IN ('provider_unavailable','provider_rejected','reconciliation_failed')) AS "retryFailure",
      EXISTS (SELECT 1 FROM payment_reconciliation_jobs j
        WHERE j.status='exhausted') AS exhausted,
      EXISTS (SELECT 1 FROM payment_reconciliation_jobs j
        WHERE
          ((j.status='pending' AND j.next_attempt_at < ${new Date(now.getTime() - 900_000)})
          OR (j.status='running' AND j.lease_until < ${new Date(now.getTime() - 900_000)}))) AS overdue,
      EXISTS (SELECT 1 FROM outbox_events j
        WHERE j.event_type='account.deletion_requested' AND j.published_at IS NULL
        AND j.attempt_count >= 10) AS "deletionExhausted",
      EXISTS (SELECT 1 FROM outbox_events j
        WHERE j.event_type='account.deletion_requested' AND j.published_at IS NULL
        AND j.attempt_count < 10
        AND COALESCE((SELECT max(a.created_at) FROM audit_events a
          WHERE a.target_id=j.id AND a.action='account.deactivation_attempt'), j.created_at)
          + CASE WHEN j.attempt_count=0 THEN interval '0 seconds'
            ELSE make_interval(secs => least(3600, 30 * power(2, j.attempt_count))::int) END
          < ${new Date(now.getTime() - 900_000)}) AS "deletionOverdue"
  `)
  const codes = new Set<PaymentOperationsCode>()
  if (!run || now.getTime() - run.createdAt.getTime() > 900_000)
    codes.add('heartbeat_stale')
  const allowed: PaymentOperationsCode[] = [
    'worker_failed',
    'wallet_discrepancy',
    'audit_incomplete',
  ]
  const metadata = run?.metadata as { codes?: unknown } | null | undefined
  if (Array.isArray(metadata?.codes))
    for (const code of allowed) {
      if (metadata.codes.includes(code)) codes.add(code)
    }
  if (jobs.rows[0]?.exhausted) codes.add('jobs_exhausted')
  if (jobs.rows[0]?.retryFailure) codes.add('worker_failed')
  if (jobs.rows[0]?.overdue) codes.add('jobs_overdue')
  if (jobs.rows[0]?.deletionExhausted) codes.add('deletion_jobs_exhausted')
  if (jobs.rows[0]?.deletionOverdue) codes.add('deletion_jobs_overdue')
  return { healthy: codes.size === 0, codes: [...codes] }
}
