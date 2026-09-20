import type { AccountState, StaffRole } from '@curiofold/domain'
import { and, eq, isNull, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

type CuriofoldDatabase = NodePgDatabase<typeof schema>

export interface IdentityAccount {
  readonly accountState: AccountState
  readonly emailVerified: boolean
  readonly staffRoles: ReadonlySet<StaffRole>
  readonly userId: string
}

export interface IdentityLifecycleEvent {
  readonly emailVerified: boolean
  readonly eventId: string
  readonly occurredAt: Date
  readonly subject: string
  readonly type: 'user.created' | 'user.deleted' | 'user.updated'
}

export type IdentityLifecycleResult = 'applied' | 'duplicate' | 'ignored'

async function readIdentityAccount(
  database: CuriofoldDatabase,
  subject: string,
): Promise<IdentityAccount | null> {
  const [account] = await database
    .select({
      accountState: schema.users.accountState,
      emailVerifiedAt: schema.users.emailVerifiedAt,
      userId: schema.users.id,
    })
    .from(schema.users)
    .where(eq(schema.users.clerkSubject, subject))
    .limit(1)

  if (!account) {
    return null
  }

  const assignments = await database
    .select({ role: schema.staffRoleAssignments.role })
    .from(schema.staffRoleAssignments)
    .where(
      and(
        eq(schema.staffRoleAssignments.userId, account.userId),
        isNull(schema.staffRoleAssignments.revokedAt),
      ),
    )

  return {
    accountState: account.accountState,
    emailVerified: account.emailVerifiedAt !== null,
    staffRoles: new Set(assignments.map(({ role }) => role)),
    userId: account.userId,
  }
}

export async function ensureIdentityAccount(
  database: CuriofoldDatabase,
  subject: string,
  authenticatedAt: Date,
): Promise<IdentityAccount> {
  await database
    .insert(schema.users)
    .values({ clerkSubject: subject, lastAuthenticatedAt: authenticatedAt })
    .onConflictDoUpdate({
      set: { lastAuthenticatedAt: authenticatedAt, updatedAt: authenticatedAt },
      target: schema.users.clerkSubject,
    })

  const account = await readIdentityAccount(database, subject)
  if (!account) {
    throw new Error('Identity account linkage failed.')
  }

  return account
}

export async function findIdentityAccount(
  database: CuriofoldDatabase,
  subject: string,
): Promise<IdentityAccount | null> {
  return readIdentityAccount(database, subject)
}

export async function applyIdentityLifecycleEvent(
  database: CuriofoldDatabase,
  event: IdentityLifecycleEvent,
): Promise<IdentityLifecycleResult> {
  return database.transaction(async (transaction) => {
    await transaction.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${event.subject}))`,
    )

    const [recorded] = await transaction
      .insert(schema.identityEvents)
      .values({
        eventType: event.type,
        occurredAt: event.occurredAt,
        providerEventId: event.eventId,
        subject: event.subject,
      })
      .onConflictDoNothing({ target: schema.identityEvents.providerEventId })
      .returning({ id: schema.identityEvents.id })

    if (!recorded) {
      return 'duplicate'
    }

    const [existing] = await transaction
      .select({
        id: schema.users.id,
        lastIdentityEventAt: schema.users.lastIdentityEventAt,
      })
      .from(schema.users)
      .where(eq(schema.users.clerkSubject, event.subject))
      .limit(1)
      .for('update')

    if (
      existing?.lastIdentityEventAt &&
      existing.lastIdentityEventAt.getTime() > event.occurredAt.getTime()
    ) {
      await transaction
        .update(schema.identityEvents)
        .set({ result: 'ignored' })
        .where(eq(schema.identityEvents.id, recorded.id))
      return 'ignored'
    }

    const commonUpdate = {
      lastIdentityEventAt: event.occurredAt,
      lastIdentityEventId: event.eventId,
      updatedAt: event.occurredAt,
    }

    if (event.type === 'user.deleted') {
      if (existing) {
        await transaction
          .update(schema.users)
          .set({
            ...commonUpdate,
            accountState: 'disabled',
            deletedAt: event.occurredAt,
            emailVerifiedAt: null,
          })
          .where(eq(schema.users.id, existing.id))
      } else {
        await transaction.insert(schema.users).values({
          ...commonUpdate,
          accountState: 'disabled',
          clerkSubject: event.subject,
          deletedAt: event.occurredAt,
        })
      }

      return 'applied'
    }

    const emailVerifiedAt = event.emailVerified ? event.occurredAt : null
    if (existing) {
      await transaction
        .update(schema.users)
        .set({ ...commonUpdate, emailVerifiedAt })
        .where(eq(schema.users.id, existing.id))
    } else {
      await transaction.insert(schema.users).values({
        ...commonUpdate,
        clerkSubject: event.subject,
        emailVerifiedAt,
      })
    }

    return 'applied'
  })
}
