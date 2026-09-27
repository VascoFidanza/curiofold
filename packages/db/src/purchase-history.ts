import type {
  PaymentOrderStatus,
  PaymentReversalStatus,
} from '@curiofold/domain'
import { and, desc, eq, inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

type CuriofoldDatabase = NodePgDatabase<typeof schema>

export interface PurchaseHistoryItem {
  readonly amountMinor: number
  readonly createdAt: Date
  readonly credits: number
  readonly currency: string
  readonly id: string
  readonly kind: 'credit_top_up' | 'individual_story'
  readonly reversals: readonly Readonly<{
    amountMinor: number
    kind: 'refund' | 'dispute' | 'support_correction'
    status: PaymentReversalStatus
  }>[]
  readonly status: PaymentOrderStatus
  readonly story: Readonly<{ slug: string; title: string }> | null
}

/** Recent owner-scoped orders; reversal evidence is never derived from wallet entries. */
export async function listPurchaseHistory(
  database: CuriofoldDatabase,
  userId: string,
  locale: string,
  limit = 10,
): Promise<readonly PurchaseHistoryItem[]> {
  if (
    !userId.trim() ||
    !locale.trim() ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 25
  )
    throw new TypeError('Purchase history arguments are invalid.')

  const orders = await database
    .select({
      amountMinor: schema.paymentOrders.amountMinor,
      createdAt: schema.paymentOrders.createdAt,
      credits: schema.paymentOrders.creditsPurchased,
      currency: schema.paymentOrders.currency,
      id: schema.paymentOrders.id,
      purchaseType: schema.paymentOrders.purchaseType,
      status: schema.paymentOrders.status,
      storySlug: schema.storyLocalizations.slug,
      storyTitle: schema.storyLocalizations.title,
    })
    .from(schema.paymentOrders)
    .leftJoin(
      schema.storyLocalizations,
      and(
        eq(schema.storyLocalizations.storyId, schema.paymentOrders.storyId),
        eq(schema.storyLocalizations.locale, locale),
      ),
    )
    .where(eq(schema.paymentOrders.userId, userId))
    .orderBy(
      desc(schema.paymentOrders.createdAt),
      desc(schema.paymentOrders.id),
    )
    .limit(limit)

  if (orders.length === 0) return []
  const reversals = await database
    .select({
      amountMinor: schema.paymentReversals.amountMinor,
      kind: schema.paymentReversals.kind,
      orderId: schema.paymentReversals.orderId,
      status: schema.paymentReversals.status,
    })
    .from(schema.paymentReversals)
    .where(
      inArray(
        schema.paymentReversals.orderId,
        orders.map((order) => order.id),
      ),
    )
    .orderBy(
      desc(schema.paymentReversals.createdAt),
      desc(schema.paymentReversals.id),
    )

  return orders.map((order) => ({
    amountMinor: order.amountMinor,
    createdAt: order.createdAt,
    credits: order.credits,
    currency: order.currency,
    id: order.id,
    kind:
      order.purchaseType === 'individual_story'
        ? 'individual_story'
        : 'credit_top_up',
    reversals: reversals
      .filter((reversal) => reversal.orderId === order.id)
      .map(({ amountMinor, kind, status }) => ({ amountMinor, kind, status })),
    status: order.status,
    story:
      order.storySlug && order.storyTitle
        ? { slug: order.storySlug, title: order.storyTitle }
        : null,
  }))
}
