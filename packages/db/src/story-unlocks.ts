import { normalizeCreditOperationKey } from '@curiofold/domain'
import { and, asc, eq, gt } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

type CuriofoldDatabase = NodePgDatabase<typeof schema>
type UnlockOutcome = 'already_owned' | 'unlocked'
type StoredUnlockOperation = UnlockStoryResult &
  Readonly<{ storyId: string; userId: string }>

export interface UnlockStoryInput {
  readonly now?: Date
  readonly operationKey: string
  readonly storyId: string
  readonly userId: string
}

export interface UnlockStoryResult {
  readonly availableCredits: number
  readonly entitlementId: string
  readonly operationId: string
  readonly outcome: UnlockOutcome
  readonly walletEntryId: string | null
  readonly walletVersion: number
}

export class InsufficientCreditsError extends Error {
  override readonly name = 'InsufficientCreditsError'

  constructor() {
    super('At least one spendable credit is required to unlock this Story.')
  }
}

export class UnlockOperationConflictError extends Error {
  override readonly name = 'UnlockOperationConflictError'

  constructor() {
    super(
      'The unlock operation key already belongs to a different user or Story.',
    )
  }
}

export class StoryUnlockUnavailableError extends Error {
  override readonly name = 'StoryUnlockUnavailableError'

  constructor() {
    super('The Story is not available for unlock.')
  }
}

export class FinancialIntegrityError extends Error {
  override readonly name = 'FinancialIntegrityError'
}

function toUnlockResult(operation: StoredUnlockOperation): UnlockStoryResult {
  return {
    availableCredits: operation.availableCredits,
    entitlementId: operation.entitlementId,
    operationId: operation.operationId,
    outcome: operation.outcome,
    walletEntryId: operation.walletEntryId,
    walletVersion: operation.walletVersion,
  }
}

export async function unlockStoryWithCredit(
  database: CuriofoldDatabase,
  input: UnlockStoryInput,
): Promise<UnlockStoryResult> {
  const operationKey = normalizeCreditOperationKey(input.operationKey)
  const now = input.now ?? new Date()

  try {
    return await database.transaction(async (transaction) => {
      const findOperation = async () => {
        const [operation] = await transaction
          .select({
            availableCredits: schema.unlockOperations.balanceAfter,
            entitlementId: schema.unlockOperations.entitlementId,
            operationId: schema.unlockOperations.id,
            outcome: schema.unlockOperations.outcome,
            storyId: schema.unlockOperations.storyId,
            userId: schema.unlockOperations.userId,
            walletEntryId: schema.unlockOperations.walletEntryId,
            walletVersion: schema.unlockOperations.walletVersion,
          })
          .from(schema.unlockOperations)
          .where(eq(schema.unlockOperations.operationKey, operationKey))
          .limit(1)

        if (!operation) {
          return null
        }
        if (
          operation.userId !== input.userId ||
          operation.storyId !== input.storyId
        ) {
          throw new UnlockOperationConflictError()
        }
        return operation satisfies StoredUnlockOperation
      }

      const existingOperation = await findOperation()
      if (existingOperation) {
        return toUnlockResult(existingOperation)
      }

      const findEntitlement = async () => {
        const [entitlement] = await transaction
          .select({
            id: schema.storyEntitlements.id,
            status: schema.storyEntitlements.status,
          })
          .from(schema.storyEntitlements)
          .where(
            and(
              eq(schema.storyEntitlements.userId, input.userId),
              eq(schema.storyEntitlements.storyId, input.storyId),
            ),
          )
          .limit(1)
          .for('update')
        return entitlement ?? null
      }

      const recordOperation = async (
        result: Omit<UnlockStoryResult, 'operationId'>,
      ): Promise<UnlockStoryResult> => {
        const [created] = await transaction
          .insert(schema.unlockOperations)
          .values({
            balanceAfter: result.availableCredits,
            entitlementId: result.entitlementId,
            createdAt: now,
            operationKey,
            outcome: result.outcome,
            storyId: input.storyId,
            userId: input.userId,
            walletEntryId: result.walletEntryId,
            walletVersion: result.walletVersion,
          })
          .onConflictDoNothing({ target: schema.unlockOperations.operationKey })
          .returning({ id: schema.unlockOperations.id })

        if (created) {
          return { ...result, operationId: created.id }
        }

        const concurrent = await findOperation()
        if (!concurrent) {
          throw new FinancialIntegrityError(
            'Unlock operation conflict could not be resolved.',
          )
        }
        return toUnlockResult(concurrent)
      }

      const existingEntitlement = await findEntitlement()
      if (existingEntitlement?.status === 'revoked') {
        throw new StoryUnlockUnavailableError()
      }
      if (existingEntitlement) {
        const [wallet] = await transaction
          .select({
            balanceCached: schema.walletAccounts.balanceCached,
            version: schema.walletAccounts.version,
          })
          .from(schema.walletAccounts)
          .where(eq(schema.walletAccounts.userId, input.userId))
          .limit(1)

        return recordOperation({
          availableCredits: wallet?.balanceCached ?? 0,
          entitlementId: existingEntitlement.id,
          outcome: 'already_owned',
          walletEntryId: null,
          walletVersion: wallet?.version ?? 0,
        })
      }

      const [publishedStory] = await transaction
        .select({ id: schema.stories.id })
        .from(schema.stories)
        .innerJoin(
          schema.storyLocalizations,
          eq(schema.storyLocalizations.storyId, schema.stories.id),
        )
        .where(
          and(
            eq(schema.stories.id, input.storyId),
            eq(schema.storyLocalizations.state, 'published'),
          ),
        )
        .limit(1)

      if (!publishedStory) {
        throw new StoryUnlockUnavailableError()
      }

      const [wallet] = await transaction
        .select({
          balanceCached: schema.walletAccounts.balanceCached,
          id: schema.walletAccounts.id,
          version: schema.walletAccounts.version,
        })
        .from(schema.walletAccounts)
        .where(eq(schema.walletAccounts.userId, input.userId))
        .limit(1)
        .for('update')

      if (!wallet) {
        throw new InsufficientCreditsError()
      }

      const operationAfterLock = await findOperation()
      if (operationAfterLock) {
        return toUnlockResult(operationAfterLock)
      }

      const entitlementAfterLock = await findEntitlement()
      if (entitlementAfterLock?.status === 'revoked') {
        throw new StoryUnlockUnavailableError()
      }
      if (entitlementAfterLock) {
        return recordOperation({
          availableCredits: wallet.balanceCached,
          entitlementId: entitlementAfterLock.id,
          outcome: 'already_owned',
          walletEntryId: null,
          walletVersion: wallet.version,
        })
      }

      if (wallet.balanceCached < 1) {
        throw new InsufficientCreditsError()
      }

      const [spendableGrant] = await transaction
        .select({
          id: schema.creditGrants.id,
          unitsRemaining: schema.creditGrants.unitsRemaining,
        })
        .from(schema.creditGrants)
        .where(
          and(
            eq(schema.creditGrants.walletAccountId, wallet.id),
            gt(schema.creditGrants.unitsRemaining, 0),
          ),
        )
        .orderBy(
          asc(schema.creditGrants.grantedAt),
          asc(schema.creditGrants.id),
        )
        .limit(1)
        .for('update')

      if (!spendableGrant) {
        throw new FinancialIntegrityError(
          'Wallet balance has no spendable credit-grant provenance.',
        )
      }

      const nextBalance = wallet.balanceCached - 1
      const nextVersion = wallet.version + 1
      const reason = 'Credit-funded Story unlock.'

      const [entitlement] = await transaction
        .insert(schema.storyEntitlements)
        .values({
          grantedAt: now,
          grantSource: 'unlock',
          storyId: input.storyId,
          updatedAt: now,
          userId: input.userId,
        })
        .returning({ id: schema.storyEntitlements.id })
      if (!entitlement) {
        throw new FinancialIntegrityError('Story entitlement was not created.')
      }

      await transaction.insert(schema.entitlementEvents).values({
        actorUserId: input.userId,
        entitlementId: entitlement.id,
        eventType: 'granted',
        occurredAt: now,
        reason,
      })

      const [entry] = await transaction
        .insert(schema.walletEntries)
        .values({
          actorUserId: input.userId,
          balanceAfter: nextBalance,
          delta: -1,
          entryType: 'spend',
          occurredAt: now,
          operationKey,
          reason,
          walletAccountId: wallet.id,
        })
        .returning({ id: schema.walletEntries.id })
      if (!entry) {
        throw new FinancialIntegrityError('Wallet debit was not created.')
      }

      await transaction.insert(schema.creditSpendAllocations).values({
        createdAt: now,
        creditGrantId: spendableGrant.id,
        units: 1,
        walletEntryId: entry.id,
      })
      await transaction
        .update(schema.creditGrants)
        .set({
          unitsRemaining: spendableGrant.unitsRemaining - 1,
          updatedAt: now,
        })
        .where(eq(schema.creditGrants.id, spendableGrant.id))
      await transaction
        .update(schema.walletAccounts)
        .set({
          balanceCached: nextBalance,
          updatedAt: now,
          version: nextVersion,
        })
        .where(eq(schema.walletAccounts.id, wallet.id))

      await transaction.insert(schema.auditEvents).values({
        action: 'story.unlocked_with_credit',
        actorUserId: input.userId,
        metadata: { debitCredits: 1 },
        reason,
        targetId: entitlement.id,
        targetType: 'story_entitlement',
      })

      return recordOperation({
        availableCredits: nextBalance,
        entitlementId: entitlement.id,
        outcome: 'unlocked',
        walletEntryId: entry.id,
        walletVersion: nextVersion,
      })
    })
  } catch (error) {
    const databaseError = error as {
      readonly code?: string
      readonly constraint?: string
    }
    if (
      databaseError.code !== '23505' ||
      databaseError.constraint !== 'wallet_entries_operation_key_unique'
    ) {
      throw error
    }

    const [operation] = await database
      .select({
        availableCredits: schema.unlockOperations.balanceAfter,
        entitlementId: schema.unlockOperations.entitlementId,
        operationId: schema.unlockOperations.id,
        outcome: schema.unlockOperations.outcome,
        storyId: schema.unlockOperations.storyId,
        userId: schema.unlockOperations.userId,
        walletEntryId: schema.unlockOperations.walletEntryId,
        walletVersion: schema.unlockOperations.walletVersion,
      })
      .from(schema.unlockOperations)
      .where(eq(schema.unlockOperations.operationKey, operationKey))
      .limit(1)

    if (
      operation?.userId !== input.userId ||
      operation.storyId !== input.storyId
    ) {
      throw new UnlockOperationConflictError()
    }
    return toUnlockResult(operation)
  }
}
