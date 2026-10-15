import { clerkClient } from '@clerk/nextjs/server'
import { processAccountDeletions } from '@curiofold/db'

import { getDatabase } from './database'

export async function deactivateClerkAccount(subject: string) {
  const client = await clerkClient()
  await client.users.banUser(subject)
  // Always read the first page: revocation removes sessions from the active set.
  for (let page = 0; page < 100; page += 1) {
    const sessions = await client.sessions.getSessionList({
      userId: subject,
      status: 'active',
      limit: 100,
    })
    if (sessions.data.length === 0) return
    for (const session of sessions.data)
      await client.sessions.revokeSession(session.id)
  }
  throw new Error('Session revocation incomplete')
}

export function runAccountDeletionBatch() {
  return processAccountDeletions(getDatabase().client, deactivateClerkAccount)
}
