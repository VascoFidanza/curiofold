import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from './schema'

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
