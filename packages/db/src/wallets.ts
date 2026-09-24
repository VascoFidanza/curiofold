import {
  assertPositiveCreditUnits,
  creditGrantSources,
  normalizeCreditOperationKey,
  type CreditGrantReceipt,
  type CreditGrantSource,
  type WalletBalance,
} from '@curiofold/domain'
import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

type CuriofoldDatabase = NodePgDatabase<typeof schema>
type CuriofoldTransaction = Parameters<
  Parameters<CuriofoldDatabase['transaction']>[0]
>[0]

const postgresIntegerMaximum = 2_147_483_647
const maximumReasonLength = 1_000

export interface GrantCreditsInput {
  readonly actorUserId?: string
  readonly grantedAt?: Date
  readonly operationKey: string
  readonly reason: string
  readonly source: CreditGrantSource
  readonly sourceReference?: string
  readonly units: number
  readonly userId: string
}

export interface GrantCreditsResult {
  readonly created: boolean
  readonly receipt: CreditGrantReceipt
}

export class CreditGrantConflictError extends Error {
  override readonly name = 'CreditGrantConflictError'

  constructor() {
    super(
      'The credit operation key already belongs to a different grant command.',
    )
  }
}

function normalizeReason(reason: string): string {
  const normalized = reason.trim()
  if (!normalized || normalized.length > maximumReasonLength) {
    throw new TypeError(
      `Credit grant reasons must contain 1–${String(maximumReasonLength)} characters.`,
    )
  }
  return normalized
}

function normalizeSourceReference(
  sourceReference: string | undefined,
): string | undefined {
  if (sourceReference === undefined) {
    return undefined
  }

  const normalized = sourceReference.trim()
  if (!normalized || normalized.length > 255) {
    throw new TypeError(
      'Credit grant source references must contain 1–255 characters.',
    )
  }
  return normalized
}

function assertGrantSource(
  source: string,
): asserts source is CreditGrantSource {
  if (!creditGrantSources.some((candidate) => candidate === source)) {
    throw new TypeError('Credit grant source is not supported.')
  }
}

export async function findWalletBalance(
  database: CuriofoldDatabase,
  userId: string,
): Promise<WalletBalance> {
  const [wallet] = await database
    .select({
      availableCredits: schema.walletAccounts.balanceCached,
      version: schema.walletAccounts.version,
    })
    .from(schema.walletAccounts)
    .where(eq(schema.walletAccounts.userId, userId))
    .limit(1)

  return wallet ?? { availableCredits: 0, version: 0 }
}

export async function grantCredits(
  database: CuriofoldDatabase,
  input: GrantCreditsInput,
): Promise<GrantCreditsResult> {
  assertPositiveCreditUnits(input.units)
  assertGrantSource(input.source)

  const grantedAt = input.grantedAt ?? new Date()
  const operationKey = normalizeCreditOperationKey(input.operationKey)
  const reason = normalizeReason(input.reason)
  const sourceReference = normalizeSourceReference(input.sourceReference)

  return database.transaction((transaction) =>
    grantCreditsWithinTransaction(transaction, {
      ...input,
      grantedAt,
      operationKey,
      reason,
      ...(sourceReference ? { sourceReference } : {}),
    }),
  )
}

export async function grantCreditsWithinTransaction(
  transaction: CuriofoldTransaction,
  input: GrantCreditsInput,
): Promise<GrantCreditsResult> {
  assertPositiveCreditUnits(input.units)
  assertGrantSource(input.source)

  const grantedAt = input.grantedAt ?? new Date()
  const operationKey = normalizeCreditOperationKey(input.operationKey)
  const reason = normalizeReason(input.reason)
  const sourceReference = normalizeSourceReference(input.sourceReference)

  await transaction
    .insert(schema.walletAccounts)
    .values({ userId: input.userId })
    .onConflictDoNothing({ target: schema.walletAccounts.userId })

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
    throw new Error('Wallet creation could not be resolved.')
  }

  const [createdGrant] = await transaction
    .insert(schema.creditGrants)
    .values({
      actorUserId: input.actorUserId,
      grantedAt,
      operationKey,
      reason,
      source: input.source,
      sourceReference,
      unitsGranted: input.units,
      unitsRemaining: input.units,
      updatedAt: grantedAt,
      walletAccountId: wallet.id,
    })
    .onConflictDoNothing({ target: schema.creditGrants.operationKey })
    .returning({ id: schema.creditGrants.id })

  if (!createdGrant) {
    const [existing] = await transaction
      .select({
        availableCredits: schema.walletAccounts.balanceCached,
        grantId: schema.creditGrants.id,
        source: schema.creditGrants.source,
        sourceReference: schema.creditGrants.sourceReference,
        unitsGranted: schema.creditGrants.unitsGranted,
        userId: schema.walletAccounts.userId,
        walletVersion: schema.walletAccounts.version,
      })
      .from(schema.creditGrants)
      .innerJoin(
        schema.walletAccounts,
        eq(schema.walletAccounts.id, schema.creditGrants.walletAccountId),
      )
      .where(eq(schema.creditGrants.operationKey, operationKey))
      .limit(1)

    if (
      existing?.userId !== input.userId ||
      existing.source !== input.source ||
      existing.sourceReference !== (sourceReference ?? null) ||
      existing.unitsGranted !== input.units
    ) {
      throw new CreditGrantConflictError()
    }

    return {
      created: false,
      receipt: {
        availableCredits: existing.availableCredits,
        grantId: existing.grantId,
        grantedCredits: existing.unitsGranted,
        source: existing.source,
        walletVersion: existing.walletVersion,
      },
    }
  }

  const nextBalance = wallet.balanceCached + input.units
  if (
    !Number.isSafeInteger(nextBalance) ||
    nextBalance > postgresIntegerMaximum
  ) {
    throw new RangeError('Wallet balance exceeds the supported range.')
  }
  const nextVersion = wallet.version + 1

  await transaction.insert(schema.walletEntries).values({
    actorUserId: input.actorUserId,
    balanceAfter: nextBalance,
    creditGrantId: createdGrant.id,
    delta: input.units,
    entryType: 'grant',
    occurredAt: grantedAt,
    operationKey,
    reason,
    walletAccountId: wallet.id,
    walletVersion: nextVersion,
  })

  await transaction
    .update(schema.walletAccounts)
    .set({
      balanceCached: nextBalance,
      updatedAt: grantedAt,
      version: nextVersion,
    })
    .where(eq(schema.walletAccounts.id, wallet.id))

  await transaction.insert(schema.auditEvents).values({
    action: 'wallet.credits_granted',
    actorUserId: input.actorUserId,
    metadata: {
      source: input.source,
      units: input.units,
    },
    reason,
    targetId: createdGrant.id,
    targetType: 'credit_grant',
  })

  return {
    created: true,
    receipt: {
      availableCredits: nextBalance,
      grantId: createdGrant.id,
      grantedCredits: input.units,
      source: input.source,
      walletVersion: nextVersion,
    },
  }
}
