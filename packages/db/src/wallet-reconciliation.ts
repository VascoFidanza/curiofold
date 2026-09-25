import { and, asc, desc, eq, gt, inArray, lt, or } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

type CuriofoldDatabase = NodePgDatabase<typeof schema>

const defaultHistoryLimit = 20
const maximumHistoryLimit = 100
const defaultReconciliationLimit = 100
const maximumReconciliationLimit = 500
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export type WalletTransactionKind =
  'credit_added' | 'credit_adjustment' | 'credit_reversal' | 'story_unlocked'

export interface WalletTransaction {
  readonly credits: number
  readonly id: string
  readonly kind: WalletTransactionKind
  readonly occurredAt: Date
  readonly source?:
    'correction' | 'payment' | 'promotional' | 'seed' | 'support'
  readonly storyId?: string
}

export interface WalletHistoryPage {
  readonly balance: {
    readonly availableCredits: number
    readonly version: number
  }
  readonly nextCursor: string | null
  readonly transactions: readonly WalletTransaction[]
}

export type WalletDiscrepancyCode =
  | 'allocation_wallet_mismatch'
  | 'credit_grant_ledger_mismatch'
  | 'credit_grant_remaining_mismatch'
  | 'entitlement_unlock_mismatch'
  | 'reversal_grant_mismatch'
  | 'spend_allocation_mismatch'
  | 'unlock_operation_mismatch'
  | 'wallet_balance_mismatch'
  | 'wallet_entry_running_balance_mismatch'
  | 'wallet_entry_version_mismatch'
  | 'wallet_version_mismatch'

export interface WalletDiscrepancy {
  readonly actual?: number
  readonly code: WalletDiscrepancyCode
  readonly entityId: string
  readonly entityType:
    | 'credit_grant'
    | 'story_entitlement'
    | 'unlock_operation'
    | 'wallet'
    | 'wallet_entry'
  readonly expected?: number
  readonly walletId: string
}

export interface WalletReconciliationResult {
  readonly checkedWallets: number
  readonly discrepancies: readonly WalletDiscrepancy[]
  readonly healthy: boolean
  readonly nextWalletId: string | null
}

export interface WalletReconciliationInput {
  readonly afterWalletId?: string
  readonly limit?: number
  readonly userId?: string
}

export class WalletReconciliationError extends Error {
  override readonly name = 'WalletReconciliationError'

  constructor(readonly result: WalletReconciliationResult) {
    super(
      `Wallet reconciliation found ${String(result.discrepancies.length)} discrepancies across ${String(result.checkedWallets)} wallets.`,
    )
  }
}

export class InvalidWalletHistoryCursorError extends Error {
  override readonly name = 'InvalidWalletHistoryCursorError'

  constructor() {
    super('Wallet history cursor is invalid.')
  }
}

interface HistoryCursor {
  readonly id: string
  readonly occurredAt: string
}

function assertLimit(limit: number, maximum: number, name: string): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > maximum) {
    throw new TypeError(
      `${name} must be an integer between 1 and ${String(maximum)}.`,
    )
  }
}

function encodeHistoryCursor(cursor: HistoryCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

function decodeHistoryCursor(cursor: string): HistoryCursor {
  try {
    const value = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError()
    }
    const candidate = value as Record<string, unknown>
    if (
      typeof candidate.id !== 'string' ||
      !uuidPattern.test(candidate.id) ||
      typeof candidate.occurredAt !== 'string' ||
      Number.isNaN(Date.parse(candidate.occurredAt))
    ) {
      throw new TypeError()
    }
    return { id: candidate.id, occurredAt: candidate.occurredAt }
  } catch {
    throw new InvalidWalletHistoryCursorError()
  }
}

function transactionKind(
  entryType: 'correction' | 'grant' | 'reversal' | 'spend',
): WalletTransactionKind {
  switch (entryType) {
    case 'grant':
      return 'credit_added'
    case 'spend':
      return 'story_unlocked'
    case 'reversal':
      return 'credit_reversal'
    case 'correction':
      return 'credit_adjustment'
  }
}

export async function findWalletHistory(
  database: CuriofoldDatabase,
  userId: string,
  input: { readonly cursor?: string; readonly limit?: number } = {},
): Promise<WalletHistoryPage> {
  const limit = input.limit ?? defaultHistoryLimit
  assertLimit(limit, maximumHistoryLimit, 'Wallet history limit')
  const cursor = input.cursor ? decodeHistoryCursor(input.cursor) : null

  const [wallet] = await database
    .select({
      availableCredits: schema.walletAccounts.balanceCached,
      id: schema.walletAccounts.id,
      version: schema.walletAccounts.version,
    })
    .from(schema.walletAccounts)
    .where(eq(schema.walletAccounts.userId, userId))
    .limit(1)

  if (!wallet) {
    return {
      balance: { availableCredits: 0, version: 0 },
      nextCursor: null,
      transactions: [],
    }
  }

  const cursorDate = cursor ? new Date(cursor.occurredAt) : null
  const rows = await database
    .select({
      creditGrantSource: schema.creditGrants.source,
      delta: schema.walletEntries.delta,
      entryType: schema.walletEntries.entryType,
      id: schema.walletEntries.id,
      occurredAt: schema.walletEntries.occurredAt,
      storyId: schema.unlockOperations.storyId,
    })
    .from(schema.walletEntries)
    .leftJoin(
      schema.creditGrants,
      eq(schema.creditGrants.id, schema.walletEntries.creditGrantId),
    )
    .leftJoin(
      schema.unlockOperations,
      eq(schema.unlockOperations.walletEntryId, schema.walletEntries.id),
    )
    .where(
      and(
        eq(schema.walletEntries.walletAccountId, wallet.id),
        cursorDate && cursor
          ? or(
              lt(schema.walletEntries.occurredAt, cursorDate),
              and(
                eq(schema.walletEntries.occurredAt, cursorDate),
                lt(schema.walletEntries.id, cursor.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(
      desc(schema.walletEntries.occurredAt),
      desc(schema.walletEntries.id),
    )
    .limit(limit + 1)

  const visibleRows = rows.slice(0, limit)
  const lastVisible = visibleRows.at(-1)
  const transactions = visibleRows.map((row): WalletTransaction => {
    const transaction: WalletTransaction = {
      credits: row.delta,
      id: row.id,
      kind: transactionKind(row.entryType),
      occurredAt: row.occurredAt,
      ...(row.creditGrantSource ? { source: row.creditGrantSource } : {}),
      ...(row.storyId ? { storyId: row.storyId } : {}),
    }
    return transaction
  })

  return {
    balance: {
      availableCredits: wallet.availableCredits,
      version: wallet.version,
    },
    nextCursor:
      rows.length > limit && lastVisible
        ? encodeHistoryCursor({
            id: lastVisible.id,
            occurredAt: lastVisible.occurredAt.toISOString(),
          })
        : null,
    transactions,
  }
}

export async function reconcileWallets(
  database: CuriofoldDatabase,
  input: WalletReconciliationInput = {},
): Promise<WalletReconciliationResult> {
  const limit = input.limit ?? defaultReconciliationLimit
  assertLimit(limit, maximumReconciliationLimit, 'Reconciliation limit')
  if (input.afterWalletId && !uuidPattern.test(input.afterWalletId)) {
    throw new TypeError('Reconciliation wallet cursor is invalid.')
  }

  const wallets = await database
    .select({
      balanceCached: schema.walletAccounts.balanceCached,
      id: schema.walletAccounts.id,
      userId: schema.walletAccounts.userId,
      version: schema.walletAccounts.version,
    })
    .from(schema.walletAccounts)
    .where(
      and(
        input.userId
          ? eq(schema.walletAccounts.userId, input.userId)
          : undefined,
        input.afterWalletId
          ? gt(schema.walletAccounts.id, input.afterWalletId)
          : undefined,
      ),
    )
    .orderBy(asc(schema.walletAccounts.id))
    .limit(limit + 1)

  const checkedWallets = wallets.slice(0, limit)
  const walletIds = checkedWallets.map(({ id }) => id)
  if (walletIds.length === 0) {
    return {
      checkedWallets: 0,
      discrepancies: [],
      healthy: true,
      nextWalletId: null,
    }
  }

  const userIds = checkedWallets.map(({ userId }) => userId)
  const [entries, grants, allocations, operations, entitlements] =
    await Promise.all([
      database
        .select()
        .from(schema.walletEntries)
        .where(inArray(schema.walletEntries.walletAccountId, walletIds)),
      database
        .select()
        .from(schema.creditGrants)
        .where(inArray(schema.creditGrants.walletAccountId, walletIds)),
      database
        .select({
          creditGrantId: schema.creditSpendAllocations.creditGrantId,
          id: schema.creditSpendAllocations.id,
          units: schema.creditSpendAllocations.units,
          walletEntryId: schema.creditSpendAllocations.walletEntryId,
        })
        .from(schema.creditSpendAllocations)
        .innerJoin(
          schema.walletEntries,
          and(
            eq(
              schema.walletEntries.id,
              schema.creditSpendAllocations.walletEntryId,
            ),
            inArray(schema.walletEntries.walletAccountId, walletIds),
          ),
        ),
      database
        .select()
        .from(schema.unlockOperations)
        .where(inArray(schema.unlockOperations.userId, userIds)),
      database
        .select()
        .from(schema.storyEntitlements)
        .where(inArray(schema.storyEntitlements.userId, userIds)),
    ])

  const discrepancies: WalletDiscrepancy[] = []
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]))
  const grantsById = new Map(grants.map((grant) => [grant.id, grant]))
  const entitlementsById = new Map(
    entitlements.map((entitlement) => [entitlement.id, entitlement]),
  )

  for (const wallet of checkedWallets) {
    const walletEntries = entries
      .filter((entry) => entry.walletAccountId === wallet.id)
      .sort((left, right) => left.walletVersion - right.walletVersion)
    const walletGrants = grants.filter(
      (grant) => grant.walletAccountId === wallet.id,
    )
    const walletEntitlements = entitlements.filter(
      (entitlement) => entitlement.userId === wallet.userId,
    )
    const walletOperations = operations.filter(
      (operation) => operation.userId === wallet.userId,
    )

    let runningBalance = 0
    for (const [index, entry] of walletEntries.entries()) {
      const expectedVersion = index + 1
      if (entry.walletVersion !== expectedVersion) {
        discrepancies.push({
          actual: entry.walletVersion,
          code: 'wallet_entry_version_mismatch',
          entityId: entry.id,
          entityType: 'wallet_entry',
          expected: expectedVersion,
          walletId: wallet.id,
        })
      }
      runningBalance += entry.delta
      if (entry.balanceAfter !== runningBalance) {
        discrepancies.push({
          actual: entry.balanceAfter,
          code: 'wallet_entry_running_balance_mismatch',
          entityId: entry.id,
          entityType: 'wallet_entry',
          expected: runningBalance,
          walletId: wallet.id,
        })
      }
    }
    if (wallet.balanceCached !== runningBalance) {
      discrepancies.push({
        actual: wallet.balanceCached,
        code: 'wallet_balance_mismatch',
        entityId: wallet.id,
        entityType: 'wallet',
        expected: runningBalance,
        walletId: wallet.id,
      })
    }
    if (wallet.version !== walletEntries.length) {
      discrepancies.push({
        actual: wallet.version,
        code: 'wallet_version_mismatch',
        entityId: wallet.id,
        entityType: 'wallet',
        expected: walletEntries.length,
        walletId: wallet.id,
      })
    }

    for (const grant of walletGrants) {
      const grantEntries = walletEntries.filter(
        (entry) =>
          entry.entryType === 'grant' && entry.creditGrantId === grant.id,
      )
      if (
        grantEntries.length !== 1 ||
        grantEntries[0]?.delta !== grant.unitsGranted
      ) {
        discrepancies.push({
          actual: grantEntries.reduce((sum, entry) => sum + entry.delta, 0),
          code: 'credit_grant_ledger_mismatch',
          entityId: grant.id,
          entityType: 'credit_grant',
          expected: grant.unitsGranted,
          walletId: wallet.id,
        })
      }

      const allocatedUnits = allocations
        .filter((allocation) => allocation.creditGrantId === grant.id)
        .reduce((sum, allocation) => sum + allocation.units, 0)
      const reversalEntries = walletEntries.filter(
        (entry) =>
          entry.entryType === 'reversal' && entry.creditGrantId === grant.id,
      )
      const reversedUnits = reversalEntries.reduce(
        (sum, entry) => sum + Math.abs(entry.delta),
        0,
      )
      if (reversalEntries.some((entry) => entry.delta >= 0)) {
        discrepancies.push({
          actual: reversalEntries.reduce((sum, entry) => sum + entry.delta, 0),
          code: 'reversal_grant_mismatch',
          entityId: grant.id,
          entityType: 'credit_grant',
          expected: -reversedUnits,
          walletId: wallet.id,
        })
      }
      const expectedRemaining =
        grant.unitsGranted - allocatedUnits - reversedUnits
      if (grant.unitsRemaining !== expectedRemaining) {
        discrepancies.push({
          actual: grant.unitsRemaining,
          code: 'credit_grant_remaining_mismatch',
          entityId: grant.id,
          entityType: 'credit_grant',
          expected: expectedRemaining,
          walletId: wallet.id,
        })
      }
    }

    for (const entry of walletEntries.filter(
      ({ entryType }) => entryType === 'spend',
    )) {
      const entryAllocations = allocations.filter(
        (allocation) => allocation.walletEntryId === entry.id,
      )
      const allocatedUnits = entryAllocations.reduce(
        (sum, allocation) => sum + allocation.units,
        0,
      )
      if (allocatedUnits !== Math.abs(entry.delta)) {
        discrepancies.push({
          actual: allocatedUnits,
          code: 'spend_allocation_mismatch',
          entityId: entry.id,
          entityType: 'wallet_entry',
          expected: Math.abs(entry.delta),
          walletId: wallet.id,
        })
      }
      for (const allocation of entryAllocations) {
        if (
          grantsById.get(allocation.creditGrantId)?.walletAccountId !==
          wallet.id
        ) {
          discrepancies.push({
            code: 'allocation_wallet_mismatch',
            entityId: entry.id,
            entityType: 'wallet_entry',
            walletId: wallet.id,
          })
        }
      }
    }

    for (const entry of walletEntries.filter(
      ({ entryType }) => entryType === 'reversal',
    )) {
      if (
        !entry.creditGrantId ||
        entry.delta >= 0 ||
        grantsById.get(entry.creditGrantId)?.walletAccountId !== wallet.id
      ) {
        discrepancies.push({
          code: 'reversal_grant_mismatch',
          entityId: entry.id,
          entityType: 'wallet_entry',
          walletId: wallet.id,
        })
      }
    }

    for (const operation of walletOperations) {
      const entitlement = entitlementsById.get(operation.entitlementId)
      const entitlementMatches =
        entitlement?.userId === wallet.userId &&
        entitlement.storyId === operation.storyId
      if (!entitlementMatches) {
        discrepancies.push({
          code: 'unlock_operation_mismatch',
          entityId: operation.id,
          entityType: 'unlock_operation',
          walletId: wallet.id,
        })
        continue
      }
      if (operation.outcome === 'unlocked') {
        const entry = operation.walletEntryId
          ? entriesById.get(operation.walletEntryId)
          : undefined
        if (
          entry?.walletAccountId !== wallet.id ||
          entry.entryType !== 'spend' ||
          entry.delta !== -1 ||
          entry.balanceAfter !== operation.balanceAfter
        ) {
          discrepancies.push({
            code: 'unlock_operation_mismatch',
            entityId: operation.id,
            entityType: 'unlock_operation',
            walletId: wallet.id,
          })
        }
      }
    }

    for (const entitlement of walletEntitlements.filter(
      ({ grantSource }) => grantSource === 'unlock',
    )) {
      if (
        !walletOperations.some(
          (operation) =>
            operation.entitlementId === entitlement.id &&
            operation.outcome === 'unlocked',
        )
      ) {
        discrepancies.push({
          code: 'entitlement_unlock_mismatch',
          entityId: entitlement.id,
          entityType: 'story_entitlement',
          walletId: wallet.id,
        })
      }
    }
  }

  return {
    checkedWallets: checkedWallets.length,
    discrepancies,
    healthy: discrepancies.length === 0,
    nextWalletId:
      wallets.length > limit ? (checkedWallets.at(-1)?.id ?? null) : null,
  }
}

export async function assertWalletsReconciled(
  database: CuriofoldDatabase,
  input: WalletReconciliationInput = {},
): Promise<WalletReconciliationResult> {
  const result = await reconcileWallets(database, input)
  if (!result.healthy) {
    throw new WalletReconciliationError(result)
  }
  return result
}
