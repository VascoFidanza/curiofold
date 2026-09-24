import {
  assertPaymentOrderTransition,
  type PaymentProviderOrderSnapshot,
} from '@curiofold/domain'
import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'
import { grantCreditsWithinTransaction } from './wallets'

type CuriofoldDatabase = NodePgDatabase<typeof schema>

export interface RecordProviderEventInput {
  readonly eventType: string
  readonly payloadDigest: string
  readonly providerCreatedAt: Date
  readonly providerEventId: string
  readonly providerKey: string
  readonly receivedAt?: Date
}

export interface RecordedProviderEvent {
  readonly created: boolean
  readonly id: string
  readonly status: 'pending' | 'processed'
}

export interface ProcessProviderEventInput {
  readonly processedAt?: Date
  readonly providerEventId: string
  readonly providerKey: string
  readonly snapshot: PaymentProviderOrderSnapshot
}

export interface ProcessProviderEventResult {
  readonly orderId: string
  readonly outcome: 'canceled' | 'duplicate' | 'fulfilled' | 'payment_pending'
}

export class ProviderEventConflictError extends Error {
  override readonly name = 'ProviderEventConflictError'
}

export class ProviderEventRetryableError extends Error {
  override readonly name = 'ProviderEventRetryableError'
}

function normalizedIdentifier(value: string, maximumLength: number): string {
  const normalized = value.trim()
  if (!normalized || normalized.length > maximumLength) {
    throw new TypeError('Provider event identifier is invalid.')
  }
  return normalized
}

export async function recordProviderEvent(
  database: CuriofoldDatabase,
  input: RecordProviderEventInput,
): Promise<RecordedProviderEvent> {
  const providerKey = normalizedIdentifier(input.providerKey, 80)
  const providerEventId = normalizedIdentifier(input.providerEventId, 255)
  const eventType = normalizedIdentifier(input.eventType, 120)
  const digest = input.payloadDigest.trim().toLowerCase()
  if (!/^[a-f0-9]{64}$/u.test(digest)) {
    throw new TypeError('Provider event digest is invalid.')
  }
  if (Number.isNaN(input.providerCreatedAt.getTime())) {
    throw new TypeError('Provider event timestamp is invalid.')
  }

  const [created] = await database
    .insert(schema.providerEvents)
    .values({
      eventType,
      payloadDigest: digest,
      providerCreatedAt: input.providerCreatedAt,
      providerEventId,
      providerKey,
      receivedAt: input.receivedAt ?? new Date(),
    })
    .onConflictDoNothing({
      target: [
        schema.providerEvents.providerKey,
        schema.providerEvents.providerEventId,
      ],
    })
    .returning({
      id: schema.providerEvents.id,
      status: schema.providerEvents.status,
    })

  if (created) return { created: true, ...created }

  const [existing] = await database
    .select()
    .from(schema.providerEvents)
    .where(
      and(
        eq(schema.providerEvents.providerKey, providerKey),
        eq(schema.providerEvents.providerEventId, providerEventId),
      ),
    )
    .limit(1)

  if (
    existing?.eventType !== eventType ||
    existing.payloadDigest !== digest ||
    existing.providerCreatedAt.getTime() !== input.providerCreatedAt.getTime()
  ) {
    throw new ProviderEventConflictError()
  }
  return { created: false, id: existing.id, status: existing.status }
}

export async function processProviderEvent(
  database: CuriofoldDatabase,
  input: ProcessProviderEventInput,
): Promise<ProcessProviderEventResult> {
  const processedAt = input.processedAt ?? new Date()

  return database.transaction(async (transaction) => {
    const [event] = await transaction
      .select()
      .from(schema.providerEvents)
      .where(
        and(
          eq(schema.providerEvents.providerKey, input.providerKey),
          eq(schema.providerEvents.providerEventId, input.providerEventId),
        ),
      )
      .limit(1)
      .for('update')
    if (!event) throw new ProviderEventConflictError()
    if (event.status === 'processed') {
      if (!event.orderId) throw new ProviderEventConflictError()
      return { orderId: event.orderId, outcome: 'duplicate' }
    }

    const [order] = await transaction
      .select()
      .from(schema.paymentOrders)
      .where(
        and(
          eq(schema.paymentOrders.providerKey, input.providerKey),
          eq(
            schema.paymentOrders.providerCheckoutSessionId,
            input.snapshot.providerSessionId,
          ),
        ),
      )
      .limit(1)
      .for('update')
    if (!order) {
      throw new ProviderEventRetryableError(
        'Payment order is not available yet.',
      )
    }

    if (order.status === 'fulfilled') {
      if (
        input.snapshot.state === 'paid' &&
        order.providerPaymentId !== input.snapshot.providerPaymentId
      ) {
        throw new ProviderEventConflictError()
      }
      await transaction
        .update(schema.providerEvents)
        .set({
          attemptCount: event.attemptCount + 1,
          lastAttemptAt: processedAt,
          orderId: order.id,
          processedAt,
          status: 'processed',
        })
        .where(eq(schema.providerEvents.id, event.id))
      return { orderId: order.id, outcome: 'duplicate' }
    }

    let outcome: ProcessProviderEventResult['outcome']
    if (input.snapshot.state === 'paid') {
      if (!input.snapshot.providerPaymentId) {
        throw new ProviderEventRetryableError(
          'Paid order has no payment identifier.',
        )
      }
      assertPaymentOrderTransition(order.status, 'fulfilled', 'provider_event')
      await grantCreditsWithinTransaction(transaction, {
        grantedAt: processedAt,
        operationKey: `payment:${order.id}`,
        reason: 'Credits purchased through a verified payment order.',
        source: 'payment',
        sourceReference: order.id,
        units: order.creditsPurchased,
        userId: order.userId,
      })
      await transaction
        .update(schema.paymentOrders)
        .set({
          providerPaymentId: input.snapshot.providerPaymentId,
          status: 'fulfilled',
          updatedAt: processedAt,
        })
        .where(eq(schema.paymentOrders.id, order.id))
      await transaction.insert(schema.outboxEvents).values({
        aggregateId: order.id,
        aggregateType: 'payment_order',
        eventType: 'payment.order_fulfilled',
        payload: { orderId: order.id, userId: order.userId },
      })
      await transaction.insert(schema.auditEvents).values({
        action: 'payment.order_fulfilled',
        metadata: {
          credits: order.creditsPurchased,
          providerKey: input.providerKey,
        },
        targetId: order.id,
        targetType: 'payment_order',
      })
      outcome = 'fulfilled'
    } else if (input.snapshot.state === 'payment_pending') {
      if (order.status === 'checkout_created') {
        assertPaymentOrderTransition(
          order.status,
          'payment_pending',
          'provider_event',
        )
        await transaction
          .update(schema.paymentOrders)
          .set({ status: 'payment_pending', updatedAt: processedAt })
          .where(eq(schema.paymentOrders.id, order.id))
      } else if (order.status !== 'payment_pending') {
        throw new ProviderEventConflictError()
      }
      outcome = 'payment_pending'
    } else if (input.snapshot.state === 'canceled') {
      if (order.status !== 'canceled') {
        assertPaymentOrderTransition(order.status, 'canceled', 'provider_event')
        await transaction
          .update(schema.paymentOrders)
          .set({ status: 'canceled', updatedAt: processedAt })
          .where(eq(schema.paymentOrders.id, order.id))
      }
      outcome = 'canceled'
    } else {
      throw new ProviderEventRetryableError('Provider order is not final.')
    }

    await transaction
      .update(schema.providerEvents)
      .set({
        attemptCount: event.attemptCount + 1,
        lastAttemptAt: processedAt,
        orderId: order.id,
        processedAt,
        status: 'processed',
      })
      .where(eq(schema.providerEvents.id, event.id))

    return { orderId: order.id, outcome }
  })
}
