import { and, eq, isNull, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

/** Accept a deletion request without destroying paid value or accounting evidence. */
export async function requestAccountDeletion(
  database: NodePgDatabase<typeof schema>,
  userId: string,
): Promise<'accepted' | 'existing'> {
  return database.transaction(async (transaction) => {
    const [user] = await transaction
      .select({ state: schema.users.accountState })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .for('update')
    if (!user) throw new Error('Account unavailable.')
    if (user.state !== 'active') return 'existing'

    await transaction
      .update(schema.users)
      .set({ accountState: 'pending_deletion', updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
    await transaction.insert(schema.outboxEvents).values({
      aggregateId: userId,
      aggregateType: 'account',
      eventType: 'account.deletion_requested',
      payload: { userId },
    })
    await transaction.insert(schema.auditEvents).values({
      action: 'account.deletion_requested',
      actorUserId: userId,
      reason: 'Account holder requested deletion.',
      targetId: userId,
      targetType: 'account',
    })
    return 'accepted'
  })
}

/** Durable jobs remain pending on provider failure; all effects are retry-safe. */
export async function processAccountDeletions(
  database: NodePgDatabase<typeof schema>,
  deactivate: (subject: string) => Promise<void>,
): Promise<{ completed: number; failed: number }> {
  const result = { completed: 0, failed: 0 }
  for (let index = 0; index < 10; index += 1) {
    const outcome = await database.transaction(async (transaction) => {
      const [job] = await transaction
        .select()
        .from(schema.outboxEvents)
        .where(
          and(
            eq(schema.outboxEvents.eventType, 'account.deletion_requested'),
            isNull(schema.outboxEvents.publishedAt),
            sql`${schema.outboxEvents.attemptCount} < 10`,
          ),
        )
        .orderBy(schema.outboxEvents.createdAt)
        .limit(1)
        .for('update', { skipLocked: true })
      if (!job) return 'empty'
      const [user] = await transaction
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, job.aggregateId))
        .for('update')
      if (!user || user.accountState === 'active')
        throw new Error('Invalid deletion job')
      await transaction
        .update(schema.outboxEvents)
        .set({ attemptCount: job.attemptCount + 1 })
        .where(eq(schema.outboxEvents.id, job.id))
      try {
        await deactivate(user.clerkSubject)
      } catch {
        return 'failed'
      }
      // Reading history has no accounting purpose. Financial and ownership evidence stays intact.
      await transaction
        .delete(schema.readingProgress)
        .where(eq(schema.readingProgress.userId, user.id))
      await transaction
        .update(schema.staffRoleAssignments)
        .set({ revokedAt: new Date(), revokedByUserId: user.id })
        .where(
          and(
            eq(schema.staffRoleAssignments.userId, user.id),
            isNull(schema.staffRoleAssignments.revokedAt),
          ),
        )
      await transaction
        .update(schema.users)
        .set({
          emailVerifiedAt: null,
          lastAuthenticatedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, user.id))
      await transaction
        .update(schema.outboxEvents)
        .set({ publishedAt: new Date() })
        .where(eq(schema.outboxEvents.id, job.id))
      await transaction
        .insert(schema.auditEvents)
        .values({
          action: 'account.deactivation_completed',
          targetId: user.id,
          targetType: 'account',
          reason:
            'Identity access revoked and reading history removed; retained records await policy review.',
        })
      return 'completed'
    })
    if (outcome === 'empty') break
    if (outcome === 'failed') {
      result.failed += 1
      break
    }
    result.completed += 1
  }
  return result
}
