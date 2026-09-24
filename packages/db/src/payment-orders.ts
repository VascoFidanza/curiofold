import {
  assertPaymentOrderTransition,
  normalizePaymentOrderInput,
  type CreditPackSnapshot,
  type PaymentOrderStatus,
} from '@curiofold/domain'
import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

type CuriofoldDatabase = NodePgDatabase<typeof schema>

export interface CreatePaymentOrderInput {
  readonly createdAt?: Date
  readonly operationKey: string
  readonly returnPath?: string | null
  readonly snapshot: CreditPackSnapshot
  readonly userId: string
}

export interface PaymentOrderRecord extends CreditPackSnapshot {
  readonly createdAt: string
  readonly id: string
  readonly operationKey: string
  readonly providerCheckoutSessionId: string | null
  readonly providerKey: string | null
  readonly providerPaymentId: string | null
  readonly returnPath: string
  readonly status: PaymentOrderStatus
  readonly updatedAt: string
  readonly userId: string
}

export interface CreatePaymentOrderResult {
  readonly created: boolean
  readonly order: PaymentOrderRecord
}

export class PaymentOrderConflictError extends Error {
  override readonly name = 'PaymentOrderConflictError'

  constructor() {
    super(
      'The payment operation key already belongs to a different order command.',
    )
  }
}

export interface AttachPaymentCheckoutInput {
  readonly attachedAt?: Date
  readonly orderId: string
  readonly providerKey: string
  readonly providerSessionId: string
}

function normalizeProviderIdentifier(
  value: string,
  label: string,
  maximumLength: number,
): string {
  const normalized = value.trim()
  if (
    !normalized ||
    normalized.length > maximumLength ||
    Array.from(normalized).some((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      return codePoint <= 31 || codePoint === 127
    })
  ) {
    throw new TypeError(
      `${label} must contain 1–${String(maximumLength)} characters.`,
    )
  }
  if (
    label === 'Payment provider keys' &&
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(normalized)
  ) {
    throw new TypeError('Payment provider keys must be lowercase kebab-case.')
  }
  return normalized
}

function serializeOrder(
  order: typeof schema.paymentOrders.$inferSelect,
): PaymentOrderRecord {
  return {
    amountMinor: order.amountMinor,
    ...(order.baseCredits === null ? {} : { baseCredits: order.baseCredits }),
    ...(order.bonusCredits === null
      ? {}
      : { bonusCredits: order.bonusCredits }),
    ...(order.bonusRateBps === null
      ? {}
      : { bonusRateBps: order.bonusRateBps }),
    createdAt: order.createdAt.toISOString(),
    credits: order.creditsPurchased,
    currency: order.currency,
    id: order.id,
    operationKey: order.operationKey,
    packKey: order.packKey,
    ...(order.pricingVersion === null
      ? {}
      : { pricingVersion: order.pricingVersion }),
    ...(order.purchaseType === null
      ? {}
      : {
          purchaseType: order.purchaseType as
            'credit_top_up' | 'individual_story',
        }),
    providerCheckoutSessionId: order.providerCheckoutSessionId,
    providerKey: order.providerKey,
    providerPaymentId: order.providerPaymentId,
    returnPath: order.returnPath,
    status: order.status,
    updatedAt: order.updatedAt.toISOString(),
    userId: order.userId,
  }
}

function matchesCommand(
  order: typeof schema.paymentOrders.$inferSelect,
  input: ReturnType<typeof normalizePaymentOrderInput>,
): boolean {
  return (
    order.amountMinor === input.snapshot.amountMinor &&
    order.creditsPurchased === input.snapshot.credits &&
    order.currency === input.snapshot.currency &&
    order.packKey === input.snapshot.packKey &&
    order.baseCredits === (input.snapshot.baseCredits ?? null) &&
    order.bonusCredits === (input.snapshot.bonusCredits ?? null) &&
    order.bonusRateBps === (input.snapshot.bonusRateBps ?? null) &&
    order.pricingVersion === (input.snapshot.pricingVersion ?? null) &&
    order.purchaseType === (input.snapshot.purchaseType ?? null) &&
    order.returnPath === input.returnPath
  )
}

export async function createPaymentOrder(
  database: CuriofoldDatabase,
  input: CreatePaymentOrderInput,
): Promise<CreatePaymentOrderResult> {
  const normalized = normalizePaymentOrderInput({
    operationKey: input.operationKey,
    returnPath: input.returnPath,
    snapshot: input.snapshot,
  })
  const createdAt = input.createdAt ?? new Date()

  return database.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(schema.paymentOrders)
      .values({
        amountMinor: normalized.snapshot.amountMinor,
        baseCredits: normalized.snapshot.baseCredits,
        bonusCredits: normalized.snapshot.bonusCredits,
        bonusRateBps: normalized.snapshot.bonusRateBps,
        createdAt,
        creditsPurchased: normalized.snapshot.credits,
        currency: normalized.snapshot.currency,
        operationKey: normalized.operationKey,
        packKey: normalized.snapshot.packKey,
        pricingVersion: normalized.snapshot.pricingVersion,
        purchaseType: normalized.snapshot.purchaseType,
        returnPath: normalized.returnPath,
        updatedAt: createdAt,
        userId: input.userId,
      })
      .onConflictDoNothing({
        target: [
          schema.paymentOrders.userId,
          schema.paymentOrders.operationKey,
        ],
      })
      .returning()

    if (created) {
      await transaction.insert(schema.auditEvents).values({
        action: 'payment.order_created',
        actorUserId: input.userId,
        metadata: {
          amountMinor: normalized.snapshot.amountMinor,
          baseCredits: normalized.snapshot.baseCredits,
          bonusCredits: normalized.snapshot.bonusCredits,
          bonusRateBps: normalized.snapshot.bonusRateBps,
          credits: normalized.snapshot.credits,
          currency: normalized.snapshot.currency,
          packKey: normalized.snapshot.packKey,
          pricingVersion: normalized.snapshot.pricingVersion,
          purchaseType: normalized.snapshot.purchaseType,
        },
        targetId: created.id,
        targetType: 'payment_order',
      })

      return { created: true, order: serializeOrder(created) }
    }

    const [existing] = await transaction
      .select()
      .from(schema.paymentOrders)
      .where(
        and(
          eq(schema.paymentOrders.userId, input.userId),
          eq(schema.paymentOrders.operationKey, normalized.operationKey),
        ),
      )
      .limit(1)

    if (!existing || !matchesCommand(existing, normalized)) {
      throw new PaymentOrderConflictError()
    }

    return { created: false, order: serializeOrder(existing) }
  })
}

export async function findPaymentOrderForUser(
  database: CuriofoldDatabase,
  orderId: string,
  userId: string,
): Promise<PaymentOrderRecord | null> {
  const [order] = await database
    .select()
    .from(schema.paymentOrders)
    .where(
      and(
        eq(schema.paymentOrders.id, orderId),
        eq(schema.paymentOrders.userId, userId),
      ),
    )
    .limit(1)

  return order ? serializeOrder(order) : null
}

export async function findPaymentOrderById(
  database: CuriofoldDatabase,
  orderId: string,
): Promise<PaymentOrderRecord | null> {
  const [order] = await database
    .select()
    .from(schema.paymentOrders)
    .where(eq(schema.paymentOrders.id, orderId))
    .limit(1)

  return order ? serializeOrder(order) : null
}

export async function attachPaymentCheckoutSession(
  database: CuriofoldDatabase,
  input: AttachPaymentCheckoutInput,
): Promise<PaymentOrderRecord> {
  const providerKey = normalizeProviderIdentifier(
    input.providerKey,
    'Payment provider keys',
    80,
  )
  const providerSessionId = normalizeProviderIdentifier(
    input.providerSessionId,
    'Provider session identifiers',
    255,
  )
  const attachedAt = input.attachedAt ?? new Date()

  return database.transaction(async (transaction) => {
    const [order] = await transaction
      .select()
      .from(schema.paymentOrders)
      .where(eq(schema.paymentOrders.id, input.orderId))
      .limit(1)
      .for('update')

    if (!order) {
      throw new PaymentOrderConflictError()
    }

    if (order.status === 'checkout_created') {
      if (
        order.providerKey !== providerKey ||
        order.providerCheckoutSessionId !== providerSessionId
      ) {
        throw new PaymentOrderConflictError()
      }
      return serializeOrder(order)
    }

    assertPaymentOrderTransition(
      order.status,
      'checkout_created',
      'provider_event',
    )

    const [updated] = await transaction
      .update(schema.paymentOrders)
      .set({
        providerCheckoutSessionId: providerSessionId,
        providerKey,
        status: 'checkout_created',
        updatedAt: attachedAt,
      })
      .where(eq(schema.paymentOrders.id, order.id))
      .returning()

    if (!updated) {
      throw new PaymentOrderConflictError()
    }

    await transaction
      .insert(schema.paymentReconciliationJobs)
      .values({
        nextAttemptAt: attachedAt,
        orderId: order.id,
        updatedAt: attachedAt,
      })
      .onConflictDoNothing({
        target: schema.paymentReconciliationJobs.orderId,
      })

    await transaction.insert(schema.auditEvents).values({
      action: 'payment.checkout_created',
      actorUserId: order.userId,
      metadata: { providerKey },
      targetId: order.id,
      targetType: 'payment_order',
    })

    return serializeOrder(updated)
  })
}
