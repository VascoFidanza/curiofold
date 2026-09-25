import {
  normalizeCreditOperationKey,
  normalizeReversalReasonCode,
  paymentReversalKinds,
  type PaymentReversalKind,
  type PaymentReversalStatus,
} from '@curiofold/domain'
import { and, eq, notInArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

type CuriofoldDatabase = NodePgDatabase<typeof schema>

export interface CreatePaymentReversalInput {
  readonly amountMinor: number
  readonly createdAt?: Date
  readonly createdByUserId?: string | null
  readonly creditsRequested: number
  readonly kind: PaymentReversalKind
  readonly operationKey: string
  readonly orderId: string
  readonly reasonCode: string
}

export interface PaymentReversalRecord {
  readonly amountMinor: number
  readonly completedAt: string | null
  readonly createdAt: string
  readonly createdByUserId: string | null
  readonly creditsRequested: number
  readonly currency: string
  readonly id: string
  readonly kind: PaymentReversalKind
  readonly operationKey: string
  readonly orderId: string
  readonly providerKey: string | null
  readonly providerReversalId: string | null
  readonly reasonCode: string
  readonly status: PaymentReversalStatus
  readonly updatedAt: string
}

export interface CreatePaymentReversalResult {
  readonly created: boolean
  readonly reversal: PaymentReversalRecord
}

export class PaymentReversalConflictError extends Error {
  override readonly name = 'PaymentReversalConflictError'
}

export class PaymentReversalUnavailableError extends Error {
  override readonly name = 'PaymentReversalUnavailableError'

  constructor(readonly code: 'amount_exceeded' | 'order_not_fulfilled') {
    super('Payment reversal cannot be created for this order.')
  }
}

function serialize(
  reversal: typeof schema.paymentReversals.$inferSelect,
): PaymentReversalRecord {
  return {
    amountMinor: reversal.amountMinor,
    completedAt: reversal.completedAt?.toISOString() ?? null,
    createdAt: reversal.createdAt.toISOString(),
    createdByUserId: reversal.createdByUserId,
    creditsRequested: reversal.creditsRequested,
    currency: reversal.currency,
    id: reversal.id,
    kind: reversal.kind,
    operationKey: reversal.operationKey,
    orderId: reversal.orderId,
    providerKey: reversal.providerKey,
    providerReversalId: reversal.providerReversalId,
    reasonCode: reversal.reasonCode,
    status: reversal.status,
    updatedAt: reversal.updatedAt.toISOString(),
  }
}

function validateInput(input: CreatePaymentReversalInput) {
  if (!paymentReversalKinds.includes(input.kind)) {
    throw new TypeError('Payment reversal kind is invalid.')
  }
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new TypeError(
      'Reversal amounts must be positive integer minor units.',
    )
  }
  if (
    !Number.isSafeInteger(input.creditsRequested) ||
    input.creditsRequested < 0
  ) {
    throw new TypeError('Requested reversal credits must be non-negative.')
  }
  return {
    ...input,
    operationKey: normalizeCreditOperationKey(input.operationKey),
    reasonCode: normalizeReversalReasonCode(input.reasonCode),
  }
}

export async function createPaymentReversal(
  database: CuriofoldDatabase,
  input: CreatePaymentReversalInput,
): Promise<CreatePaymentReversalResult> {
  const normalized = validateInput(input)
  const createdAt = input.createdAt ?? new Date()

  return database.transaction(async (transaction) => {
    const [order] = await transaction
      .select()
      .from(schema.paymentOrders)
      .where(eq(schema.paymentOrders.id, normalized.orderId))
      .limit(1)
      .for('update')
    if (order?.status !== 'fulfilled') {
      throw new PaymentReversalUnavailableError('order_not_fulfilled')
    }

    const [existing] = await transaction
      .select()
      .from(schema.paymentReversals)
      .where(eq(schema.paymentReversals.operationKey, normalized.operationKey))
      .limit(1)
    if (existing) {
      if (
        existing.orderId !== normalized.orderId ||
        existing.kind !== normalized.kind ||
        existing.amountMinor !== normalized.amountMinor ||
        existing.creditsRequested !== normalized.creditsRequested ||
        existing.reasonCode !== normalized.reasonCode ||
        existing.createdByUserId !== (normalized.createdByUserId ?? null)
      ) {
        throw new PaymentReversalConflictError()
      }
      return { created: false, reversal: serialize(existing) }
    }

    const activeReversals = await transaction
      .select({
        amountMinor: schema.paymentReversals.amountMinor,
        creditsRequested: schema.paymentReversals.creditsRequested,
      })
      .from(schema.paymentReversals)
      .where(
        and(
          eq(schema.paymentReversals.orderId, order.id),
          notInArray(schema.paymentReversals.status, ['canceled', 'rejected']),
        ),
      )
    const amountAlreadyRequested = activeReversals.reduce(
      (total, reversal) => total + reversal.amountMinor,
      0,
    )
    const creditsAlreadyRequested = activeReversals.reduce(
      (total, reversal) => total + reversal.creditsRequested,
      0,
    )
    if (
      amountAlreadyRequested + normalized.amountMinor > order.amountMinor ||
      creditsAlreadyRequested + normalized.creditsRequested >
        order.creditsPurchased
    ) {
      throw new PaymentReversalUnavailableError('amount_exceeded')
    }

    const [created] = await transaction
      .insert(schema.paymentReversals)
      .values({
        amountMinor: normalized.amountMinor,
        createdAt,
        createdByUserId: normalized.createdByUserId ?? null,
        creditsRequested: normalized.creditsRequested,
        currency: order.currency,
        kind: normalized.kind,
        operationKey: normalized.operationKey,
        orderId: order.id,
        reasonCode: normalized.reasonCode,
        updatedAt: createdAt,
      })
      .returning()
    if (!created) throw new PaymentReversalConflictError()

    await transaction.insert(schema.auditEvents).values({
      action: 'payment.reversal_requested',
      actorUserId: normalized.createdByUserId ?? null,
      metadata: {
        amountMinor: normalized.amountMinor,
        creditsRequested: normalized.creditsRequested,
        currency: order.currency,
        kind: normalized.kind,
        reasonCode: normalized.reasonCode,
      },
      targetId: created.id,
      targetType: 'payment_reversal',
    })
    await transaction.insert(schema.outboxEvents).values({
      aggregateId: created.id,
      aggregateType: 'payment_reversal',
      eventType: 'payment.reversal_requested',
      payload: { orderId: order.id, reversalId: created.id },
    })

    return { created: true, reversal: serialize(created) }
  })
}
