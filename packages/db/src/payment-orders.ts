import {
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

function serializeOrder(
  order: typeof schema.paymentOrders.$inferSelect,
): PaymentOrderRecord {
  return {
    amountMinor: order.amountMinor,
    createdAt: order.createdAt.toISOString(),
    credits: order.creditsPurchased,
    currency: order.currency,
    id: order.id,
    operationKey: order.operationKey,
    packKey: order.packKey,
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
        createdAt,
        creditsPurchased: normalized.snapshot.credits,
        currency: normalized.snapshot.currency,
        operationKey: normalized.operationKey,
        packKey: normalized.snapshot.packKey,
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
          credits: normalized.snapshot.credits,
          currency: normalized.snapshot.currency,
          packKey: normalized.snapshot.packKey,
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
