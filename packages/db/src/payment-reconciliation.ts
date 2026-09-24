import { and, eq, lte, or, isNull } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

type CuriofoldDatabase = NodePgDatabase<typeof schema>

export interface PaymentReconciliationJob {
  readonly attemptCount: number
  readonly exhaustedAt: Date | null
  readonly id: string
  readonly lastAttemptAt: Date | null
  readonly lastErrorCode: string | null
  readonly leaseUntil: Date | null
  readonly nextAttemptAt: Date
  readonly orderId: string
  readonly status: schema.PaymentReconciliationJobStatus
}

export interface ClaimPaymentReconciliationJobsInput {
  readonly limit?: number
  readonly leaseForMs?: number
  readonly now?: Date
}

function serializeJob(
  job: typeof schema.paymentReconciliationJobs.$inferSelect,
): PaymentReconciliationJob {
  return {
    attemptCount: job.attemptCount,
    exhaustedAt: job.exhaustedAt,
    id: job.id,
    lastAttemptAt: job.lastAttemptAt,
    lastErrorCode: job.lastErrorCode,
    leaseUntil: job.leaseUntil,
    nextAttemptAt: job.nextAttemptAt,
    orderId: job.orderId,
    status: job.status,
  }
}

function boundedInteger(value: number | undefined, fallback: number): number {
  return Number.isSafeInteger(value) && value && value > 0 ? value : fallback
}

export async function ensurePaymentReconciliationJob(
  database: CuriofoldDatabase,
  orderId: string,
  now = new Date(),
): Promise<void> {
  await database
    .insert(schema.paymentReconciliationJobs)
    .values({ orderId, nextAttemptAt: now, updatedAt: now })
    .onConflictDoNothing({ target: schema.paymentReconciliationJobs.orderId })
}

export async function claimPaymentReconciliationJobs(
  database: CuriofoldDatabase,
  input: ClaimPaymentReconciliationJobsInput = {},
): Promise<readonly PaymentReconciliationJob[]> {
  const now = input.now ?? new Date()
  const limit = Math.min(boundedInteger(input.limit, 20), 100)
  const leaseUntil = new Date(
    now.getTime() + Math.min(boundedInteger(input.leaseForMs, 60_000), 300_000),
  )

  return database.transaction(async (transaction) => {
    const jobs = await transaction
      .select()
      .from(schema.paymentReconciliationJobs)
      .where(
        and(
          or(
            and(
              eq(schema.paymentReconciliationJobs.status, 'pending'),
              lte(schema.paymentReconciliationJobs.nextAttemptAt, now),
            ),
            and(
              eq(schema.paymentReconciliationJobs.status, 'running'),
              lte(schema.paymentReconciliationJobs.leaseUntil, now),
            ),
          ),
          or(
            isNull(schema.paymentReconciliationJobs.leaseUntil),
            lte(schema.paymentReconciliationJobs.leaseUntil, now),
          ),
        ),
      )
      .limit(limit)
      .for('update', { skipLocked: true })

    if (jobs.length === 0) return []

    const claimed: PaymentReconciliationJob[] = []
    for (const job of jobs) {
      const [updated] = await transaction
        .update(schema.paymentReconciliationJobs)
        .set({ leaseUntil, status: 'running', updatedAt: now })
        .where(eq(schema.paymentReconciliationJobs.id, job.id))
        .returning()
      if (updated) claimed.push(serializeJob(updated))
    }
    return claimed
  })
}

export async function completePaymentReconciliationJob(
  database: CuriofoldDatabase,
  jobId: string,
  input: { readonly now?: Date } = {},
): Promise<void> {
  const now = input.now ?? new Date()
  await database
    .update(schema.paymentReconciliationJobs)
    .set({
      exhaustedAt: null,
      lastErrorCode: null,
      leaseUntil: null,
      status: 'completed',
      updatedAt: now,
    })
    .where(eq(schema.paymentReconciliationJobs.id, jobId))
}

export async function reschedulePaymentReconciliationJob(
  database: CuriofoldDatabase,
  jobId: string,
  input: {
    readonly errorCode: string
    readonly maxAttempts?: number
    readonly now?: Date
  },
): Promise<PaymentReconciliationJob | null> {
  const now = input.now ?? new Date()
  const maxAttempts = Math.min(boundedInteger(input.maxAttempts, 8), 20)
  const [current] = await database
    .select()
    .from(schema.paymentReconciliationJobs)
    .where(eq(schema.paymentReconciliationJobs.id, jobId))
    .limit(1)
  if (!current) return null

  const attemptCount = current.attemptCount + 1
  const exhausted = attemptCount >= maxAttempts
  const delayMs = Math.min(
    60_000 * 2 ** Math.min(attemptCount - 1, 6),
    3_600_000,
  )
  const [updated] = await database
    .update(schema.paymentReconciliationJobs)
    .set({
      attemptCount,
      exhaustedAt: exhausted ? now : null,
      lastAttemptAt: now,
      lastErrorCode: input.errorCode.slice(0, 80),
      leaseUntil: null,
      nextAttemptAt: new Date(now.getTime() + delayMs),
      status: exhausted ? 'exhausted' : 'pending',
      updatedAt: now,
    })
    .where(eq(schema.paymentReconciliationJobs.id, jobId))
    .returning()
  return updated ? serializeJob(updated) : null
}
