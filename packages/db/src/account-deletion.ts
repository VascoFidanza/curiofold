import { eq } from 'drizzle-orm'
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
