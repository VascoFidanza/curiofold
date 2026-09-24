import { createHash } from 'node:crypto'

import type {
  PaymentProvider,
  PaymentProviderOrderSnapshot,
} from '@curiofold/domain'
import {
  claimPaymentReconciliationJobs,
  completePaymentReconciliationJob,
  findPaymentOrderById,
  processProviderEvent,
  recordProviderEvent,
  reschedulePaymentReconciliationJob,
  type PaymentReconciliationJob,
} from '@curiofold/db'

import { getDatabase } from './database'
import {
  createStripePaymentProvider,
  PaymentProviderError,
} from './stripe-payment-provider'

interface PaymentReconciliationWorkerDependencies {
  readonly database?: ReturnType<typeof getDatabase>['client']
  readonly now?: Date
  readonly provider?: PaymentProvider
}

export interface PaymentReconciliationBatchResult {
  readonly completed: number
  readonly exhausted: number
  readonly failed: number
  readonly claimed: number
}

function defaultProvider(): PaymentProvider {
  const secretKey = process.env.STRIPE_SECRET_KEY
  return createStripePaymentProvider({
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    ...(secretKey ? { secretKey } : {}),
  })
}

function providerEventType(snapshot: PaymentProviderOrderSnapshot): string {
  if (snapshot.state === 'paid') return 'reconciliation.payment_succeeded'
  if (snapshot.state === 'canceled') return 'reconciliation.payment_canceled'
  return 'reconciliation.payment_pending'
}

function digestSnapshot(snapshot: PaymentProviderOrderSnapshot): string {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
}

async function reconcileJob(
  job: PaymentReconciliationJob,
  database: NonNullable<PaymentReconciliationWorkerDependencies['database']>,
  provider: PaymentProvider,
  now: Date,
): Promise<'completed' | 'exhausted' | 'failed'> {
  try {
    const order = await findPaymentOrderById(database, job.orderId)
    if (!order?.providerCheckoutSessionId || !order.providerKey) {
      const next = await reschedulePaymentReconciliationJob(database, job.id, {
        errorCode: 'order_not_ready',
        now,
      })
      return next?.status === 'exhausted' ? 'exhausted' : 'failed'
    }

    const snapshot = await provider.retrieveOrder(
      order.providerCheckoutSessionId,
    )
    const eventId = `reconciliation:${job.id}:${String(job.attemptCount + 1)}`
    const recorded = await recordProviderEvent(database, {
      eventType: providerEventType(snapshot),
      payloadDigest: digestSnapshot(snapshot),
      providerCreatedAt: now,
      providerEventId: eventId,
      providerKey: order.providerKey,
      receivedAt: now,
    })

    const result = await processProviderEvent(database, {
      processedAt: now,
      providerEventId: eventId,
      providerKey: order.providerKey,
      snapshot,
    })

    if (result.outcome === 'fulfilled' || result.outcome === 'canceled') {
      await completePaymentReconciliationJob(database, job.id, { now })
      return 'completed'
    }

    const next = await reschedulePaymentReconciliationJob(database, job.id, {
      errorCode: recorded.created
        ? 'payment_pending'
        : 'payment_pending_replay',
      now,
    })
    return next?.status === 'exhausted' ? 'exhausted' : 'failed'
  } catch (error) {
    const errorCode =
      error instanceof PaymentProviderError
        ? error.retryable
          ? 'provider_unavailable'
          : 'provider_rejected'
        : 'reconciliation_failed'
    const next = await reschedulePaymentReconciliationJob(database, job.id, {
      errorCode,
      now,
    })
    return next?.status === 'exhausted' ? 'exhausted' : 'failed'
  }
}

export async function runPaymentReconciliationBatch(
  dependencies: PaymentReconciliationWorkerDependencies = {},
): Promise<PaymentReconciliationBatchResult> {
  const database = dependencies.database ?? getDatabase().client
  const now = dependencies.now ?? new Date()
  const provider = dependencies.provider ?? defaultProvider()
  const jobs = await claimPaymentReconciliationJobs(database, { now })
  let completed = 0
  let exhausted = 0
  let failed = 0

  for (const job of jobs) {
    const outcome = await reconcileJob(job, database, provider, now)
    if (outcome === 'completed') completed += 1
    else if (outcome === 'exhausted') exhausted += 1
    else failed += 1
  }

  return { claimed: jobs.length, completed, exhausted, failed }
}
