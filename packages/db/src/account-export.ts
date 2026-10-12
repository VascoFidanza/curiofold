import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

/** Explicit customer-data projection; never exports raw rows or provider payloads. */
export async function exportAccountData(
  database: NodePgDatabase<typeof schema>,
  userId: string,
) {
  if (!userId.trim()) throw new TypeError('Account user id is required.')
  return database.transaction(
    async (transaction) => {
      const [profile] = await transaction
        .select({
          id: schema.users.id,
          accountState: schema.users.accountState,
          createdAt: schema.users.createdAt,
          emailVerifiedAt: schema.users.emailVerifiedAt,
        })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
      if (!profile) throw new Error('Account not found.')
      const [wallet] = await transaction
        .select({
          availableCredits: schema.walletAccounts.balanceCached,
        })
        .from(schema.walletAccounts)
        .where(eq(schema.walletAccounts.userId, userId))
      const ownership = await transaction
        .select({
          storyId: schema.storyEntitlements.storyId,
          status: schema.storyEntitlements.status,
          grantedAt: schema.storyEntitlements.grantedAt,
          revokedAt: schema.storyEntitlements.revokedAt,
        })
        .from(schema.storyEntitlements)
        .where(eq(schema.storyEntitlements.userId, userId))
      const readingProgress = await transaction
        .select({
          storyId: schema.readingProgress.storyId,
          locale: schema.readingProgress.locale,
          versionId: schema.readingProgress.versionId,
          resumeBlockId: schema.readingProgress.resumeBlockId,
          resumeOffset: schema.readingProgress.resumeOffset,
          highWaterPercent: schema.readingProgress.highWaterPercent,
          completedAt: schema.readingProgress.completedAt,
          updatedAt: schema.readingProgress.updatedAt,
        })
        .from(schema.readingProgress)
        .where(eq(schema.readingProgress.userId, userId))
      const purchases = await transaction
        .select({
          id: schema.paymentOrders.id,
          amountMinor: schema.paymentOrders.amountMinor,
          currency: schema.paymentOrders.currency,
          credits: schema.paymentOrders.creditsPurchased,
          purchaseType: schema.paymentOrders.purchaseType,
          storyId: schema.paymentOrders.storyId,
          status: schema.paymentOrders.status,
          createdAt: schema.paymentOrders.createdAt,
          updatedAt: schema.paymentOrders.updatedAt,
        })
        .from(schema.paymentOrders)
        .where(eq(schema.paymentOrders.userId, userId))
      const walletTransactions = await transaction
        .select({
          id: schema.walletEntries.id,
          credits: schema.walletEntries.delta,
          balanceAfter: schema.walletEntries.balanceAfter,
          kind: schema.walletEntries.entryType,
          occurredAt: schema.walletEntries.occurredAt,
        })
        .from(schema.walletEntries)
        .innerJoin(
          schema.walletAccounts,
          eq(schema.walletAccounts.id, schema.walletEntries.walletAccountId),
        )
        .where(eq(schema.walletAccounts.userId, userId))
      const reversals = await transaction
        .select({
          orderId: schema.paymentReversals.orderId,
          amountMinor: schema.paymentReversals.amountMinor,
          currency: schema.paymentReversals.currency,
          kind: schema.paymentReversals.kind,
          status: schema.paymentReversals.status,
          createdAt: schema.paymentReversals.createdAt,
        })
        .from(schema.paymentReversals)
        .innerJoin(
          schema.paymentOrders,
          eq(schema.paymentOrders.id, schema.paymentReversals.orderId),
        )
        .where(eq(schema.paymentOrders.userId, userId))
      return {
        schemaVersion: 1,
        exportedAt: new Date(),
        profile,
        wallet: wallet ?? { availableCredits: 0 },
        ownership,
        readingProgress,
        purchases,
        walletTransactions,
        reversals,
      }
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  )
}
