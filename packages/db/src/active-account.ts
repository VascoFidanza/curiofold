import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

/** Acquire before other aggregate locks; deletion uses the same account lock. */
export async function lockActiveAccount(
  database: NodePgDatabase<typeof schema>,
  userId: string,
) {
  const [account] = await database
    .select({ state: schema.users.accountState })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .for('update')
  if (account?.state !== 'active') throw new Error('Account is not active')
}
