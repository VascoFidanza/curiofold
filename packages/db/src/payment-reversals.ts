import {
  assertPaymentReversalTransition,
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

export interface ReverseUnspentPurchasedCreditsInput {
  readonly completedAt?: Date
  readonly reversalId: string
  readonly transitionSource: 'guarded_operator' | 'reconciliation'
}

export interface ReverseUnspentPurchasedCreditsResult {
  readonly availableCredits: number
  readonly availablePurchasedCredits: number
  readonly outcome:
    'already_reversed' | 'no_credit_adjustment' | 'policy_required' | 'reversed'
  readonly reversedCredits: number
  readonly walletEntryId: string | null
  readonly walletVersion: number
}

export class PaymentCreditReversalUnavailableError extends Error {
  override readonly name = 'PaymentCreditReversalUnavailableError'

  constructor(
    readonly code:
      'payment_grant_missing' | 'reversal_not_found' | 'status_unavailable',
  ) {
    super('Purchased credits cannot be reversed for this request.')
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

export async function reverseUnspentPurchasedCredits(
  database: CuriofoldDatabase,
  input: ReverseUnspentPurchasedCreditsInput,
): Promise<ReverseUnspentPurchasedCreditsResult> {
  const completedAt = input.completedAt ?? new Date()

  return database.transaction(async (transaction) => {
    const [reversal] = await transaction
      .select()
      .from(schema.paymentReversals)
      .where(eq(schema.paymentReversals.id, input.reversalId))
      .limit(1)
      .for('update')
    if (!reversal) {
      throw new PaymentCreditReversalUnavailableError('reversal_not_found')
    }

    const operationKey = normalizeCreditOperationKey(
      `payment-reversal:${reversal.id}`,
    )
    if (reversal.status === 'completed') {
      const [existingEntry] = await transaction
        .select({ id: schema.walletEntries.id })
        .from(schema.walletEntries)
        .where(eq(schema.walletEntries.operationKey, operationKey))
        .limit(1)
      const [order] = await transaction
        .select({ userId: schema.paymentOrders.userId })
        .from(schema.paymentOrders)
        .where(eq(schema.paymentOrders.id, reversal.orderId))
        .limit(1)
      if (!order) {
        throw new PaymentCreditReversalUnavailableError('payment_grant_missing')
      }
      const [wallet] = await transaction
        .select({
          availableCredits: schema.walletAccounts.balanceCached,
          id: schema.walletAccounts.id,
          version: schema.walletAccounts.version,
        })
        .from(schema.walletAccounts)
        .where(eq(schema.walletAccounts.userId, order.userId))
        .limit(1)
        .for('update')
      const [grant] = wallet
        ? await transaction
            .select({ unitsRemaining: schema.creditGrants.unitsRemaining })
            .from(schema.creditGrants)
            .where(
              and(
                eq(schema.creditGrants.walletAccountId, wallet.id),
                eq(schema.creditGrants.source, 'payment'),
                eq(schema.creditGrants.sourceReference, reversal.orderId),
              ),
            )
            .limit(1)
            .for('update')
        : []
      if (!wallet || !grant) {
        throw new PaymentCreditReversalUnavailableError('payment_grant_missing')
      }
      return {
        availableCredits: wallet.availableCredits,
        availablePurchasedCredits: grant.unitsRemaining,
        outcome: 'already_reversed',
        reversedCredits: reversal.creditsRequested,
        walletEntryId: existingEntry?.id ?? null,
        walletVersion: wallet.version,
      }
    }
    if (reversal.status !== 'requested') {
      throw new PaymentCreditReversalUnavailableError('status_unavailable')
    }

    const [order] = await transaction
      .select({
        id: schema.paymentOrders.id,
        userId: schema.paymentOrders.userId,
      })
      .from(schema.paymentOrders)
      .where(eq(schema.paymentOrders.id, reversal.orderId))
      .limit(1)
    if (!order) {
      throw new PaymentCreditReversalUnavailableError('payment_grant_missing')
    }
    const [wallet] = await transaction
      .select()
      .from(schema.walletAccounts)
      .where(eq(schema.walletAccounts.userId, order.userId))
      .limit(1)
      .for('update')
    if (!wallet) {
      throw new PaymentCreditReversalUnavailableError('payment_grant_missing')
    }
    const [grant] = await transaction
      .select()
      .from(schema.creditGrants)
      .where(
        and(
          eq(schema.creditGrants.walletAccountId, wallet.id),
          eq(schema.creditGrants.source, 'payment'),
          eq(schema.creditGrants.sourceReference, order.id),
        ),
      )
      .limit(1)
      .for('update')
    if (!grant) {
      throw new PaymentCreditReversalUnavailableError('payment_grant_missing')
    }

    if (reversal.creditsRequested > grant.unitsRemaining) {
      return {
        availableCredits: wallet.balanceCached,
        availablePurchasedCredits: grant.unitsRemaining,
        outcome: 'policy_required',
        reversedCredits: 0,
        walletEntryId: null,
        walletVersion: wallet.version,
      }
    }

    assertPaymentReversalTransition(
      reversal.status,
      'provider_pending',
      input.transitionSource,
    )
    assertPaymentReversalTransition(
      'provider_pending',
      'completed',
      input.transitionSource,
    )
    if (reversal.creditsRequested === 0) {
      await transaction
        .update(schema.paymentReversals)
        .set({
          completedAt,
          status: 'completed',
          updatedAt: completedAt,
        })
        .where(eq(schema.paymentReversals.id, reversal.id))
      await transaction.insert(schema.auditEvents).values({
        action: 'payment.reversal_completed_without_credit_adjustment',
        actorUserId: reversal.createdByUserId,
        metadata: { transitionSource: input.transitionSource },
        targetId: reversal.id,
        targetType: 'payment_reversal',
      })
      await transaction.insert(schema.outboxEvents).values({
        aggregateId: reversal.id,
        aggregateType: 'payment_reversal',
        eventType: 'payment.reversal_completed',
        payload: { orderId: order.id, reversalId: reversal.id },
      })
      return {
        availableCredits: wallet.balanceCached,
        availablePurchasedCredits: grant.unitsRemaining,
        outcome: 'no_credit_adjustment',
        reversedCredits: 0,
        walletEntryId: null,
        walletVersion: wallet.version,
      }
    }

    const nextBalance = wallet.balanceCached - reversal.creditsRequested
    const nextVersion = wallet.version + 1
    const [entry] = await transaction
      .insert(schema.walletEntries)
      .values({
        actorUserId: reversal.createdByUserId,
        balanceAfter: nextBalance,
        creditGrantId: grant.id,
        delta: -reversal.creditsRequested,
        entryType: 'reversal',
        occurredAt: completedAt,
        operationKey,
        reason: `Payment reversal: ${reversal.reasonCode}`,
        walletAccountId: wallet.id,
        walletVersion: nextVersion,
      })
      .returning({ id: schema.walletEntries.id })
    if (!entry) {
      throw new PaymentReversalConflictError()
    }

    await transaction
      .update(schema.creditGrants)
      .set({
        unitsRemaining: grant.unitsRemaining - reversal.creditsRequested,
        updatedAt: completedAt,
      })
      .where(eq(schema.creditGrants.id, grant.id))
    await transaction
      .update(schema.walletAccounts)
      .set({
        balanceCached: nextBalance,
        updatedAt: completedAt,
        version: nextVersion,
      })
      .where(eq(schema.walletAccounts.id, wallet.id))
    await transaction
      .update(schema.paymentReversals)
      .set({ completedAt, status: 'completed', updatedAt: completedAt })
      .where(eq(schema.paymentReversals.id, reversal.id))
    await transaction.insert(schema.auditEvents).values({
      action: 'wallet.purchased_credits_reversed',
      actorUserId: reversal.createdByUserId,
      metadata: {
        transitionSource: input.transitionSource,
        units: reversal.creditsRequested,
      },
      targetId: reversal.id,
      targetType: 'payment_reversal',
    })
    await transaction.insert(schema.outboxEvents).values({
      aggregateId: reversal.id,
      aggregateType: 'payment_reversal',
      eventType: 'payment.reversal_credits_removed',
      payload: {
        orderId: order.id,
        reversalId: reversal.id,
        userId: order.userId,
      },
    })

    return {
      availableCredits: nextBalance,
      availablePurchasedCredits:
        grant.unitsRemaining - reversal.creditsRequested,
      outcome: 'reversed',
      reversedCredits: reversal.creditsRequested,
      walletEntryId: entry.id,
      walletVersion: nextVersion,
    }
  })
}
