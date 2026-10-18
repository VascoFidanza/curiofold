import { and, eq, isNull, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

type Database = NodePgDatabase<typeof schema>
export interface RecoveryAccountRestriction {
  id: string
  subject: string
  state: string
  readingHistory: boolean
  staffAccess: boolean
}

/** Internal snapshots contain identity references: never log or publish them. */
export function assertRecoveryAccountRestrictions(
  current: readonly RecoveryAccountRestriction[],
  restored: readonly RecoveryAccountRestriction[],
): void {
  const accounts = new Map(restored.map((account) => [account.id, account]))
  for (const restriction of current) {
    if (restriction.state === 'active') continue
    const account = accounts.get(restriction.id)
    if (
      account?.subject !== restriction.subject ||
      account.state === 'active' ||
      (restriction.state === 'pending_deletion' &&
        (account.state !== 'pending_deletion' ||
          account.readingHistory ||
          account.staffAccess))
    )
      throw new Error(
        'Restored account privacy restrictions require operator review.',
      )
  }
}

async function readRestrictions(database: Database) {
  return database.transaction(
    async (transaction) => {
      const result = await transaction.execute<
        RecoveryAccountRestriction & Record<string, unknown>
      >(sql`
      SELECT u.id, u.clerk_subject AS subject, u.account_state AS state,
        EXISTS (SELECT 1 FROM reading_progress p WHERE p.user_id=u.id) AS "readingHistory",
        EXISTS (SELECT 1 FROM staff_role_assignments r WHERE r.user_id=u.id AND r.revoked_at IS NULL) AS "staffAccess"
      FROM users u
    `)
      return result.rows
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  )
}

/** Sensitive operator-only snapshot; keep private and freeze source writes until cutover. */
export async function captureRecoveryRestrictions(database: Database) {
  return (await readRestrictions(database)).filter(
    (account) => account.state !== 'active',
  )
}

/** Only for an isolated restore with traffic/workers disabled. Never repairs finance. */
export async function reapplyRecoveryRestrictions(
  restored: Database,
  restrictions: readonly RecoveryAccountRestriction[],
  deactivate: (subject: string) => Promise<void>,
) {
  const restricted = restrictions.filter(
    (account) => account.state !== 'active',
  )
  if (
    restricted.some(
      (account) => !['disabled', 'pending_deletion'].includes(account.state),
    ) ||
    new Set(restricted.map((account) => account.id)).size !== restricted.length
  )
    throw new Error('Invalid recovery restriction snapshot.')
  await restored.transaction(async (transaction) => {
    // Stable lock ordering and complete preflight: no partial identity remapping.
    const ordered = [...restricted].sort((a, b) => a.id.localeCompare(b.id))
    for (const restriction of ordered) {
      const [account] = await transaction
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, restriction.id))
        .for('update')
      if (account?.clerkSubject !== restriction.subject)
        throw new Error('Recovery identity mapping requires operator review.')
    }
    for (const restriction of ordered) {
      const now = new Date()
      // Never downgrade an already pending deletion to a simple suspension.
      await transaction
        .update(schema.users)
        .set({
          accountState:
            restriction.state === 'pending_deletion'
              ? 'pending_deletion'
              : sql`CASE WHEN account_state='pending_deletion' THEN 'pending_deletion' ELSE 'disabled' END`,
          emailVerifiedAt: null,
          lastAuthenticatedAt: null,
          updatedAt: now,
        })
        .where(eq(schema.users.id, restriction.id))
      await transaction
        .update(schema.staffRoleAssignments)
        .set({ revokedAt: now, revokedByUserId: restriction.id })
        .where(
          and(
            eq(schema.staffRoleAssignments.userId, restriction.id),
            isNull(schema.staffRoleAssignments.revokedAt),
          ),
        )
      if (restriction.state === 'pending_deletion')
        await transaction
          .delete(schema.readingProgress)
          .where(eq(schema.readingProgress.userId, restriction.id))
    }
    if (restricted.length)
      await transaction
        .insert(schema.auditEvents)
        .values({
          action: 'recovery.account_restrictions_reapplied',
          targetType: 'recovery',
          reason:
            'Current authoritative restrictions reapplied before restored traffic opens.',
          metadata: { count: restricted.length },
        })
  })
  // Persist denial first. Provider failure cannot roll it back or authorize cutover.
  // The callback must ban/revoke sessions idempotently and enforce its own timeout.
  for (const restriction of restricted) await deactivate(restriction.subject)
  assertRecoveryAccountRestrictions(
    restricted,
    await readRestrictions(restored),
  )
  return { verified: true as const }
}

/** Run with writes frozen and restored traffic/workers disabled. No repairs or erasure. */
export async function verifyRecoveryPrivacy(
  current: Database,
  restored: Database,
) {
  const restrictions = await readRestrictions(current)
  const recovered = await readRestrictions(restored)
  assertRecoveryAccountRestrictions(restrictions, recovered)
  return { verified: true as const }
}
