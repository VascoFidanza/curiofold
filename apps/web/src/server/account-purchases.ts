import { listPurchaseHistory, type PurchaseHistoryItem } from '@curiofold/db'

import { getDatabase } from './database'
import { runtimeLogger } from './observability'

export type AccountPurchasesResolution =
  | Readonly<{ purchases: readonly PurchaseHistoryItem[]; status: 'available' }>
  | Readonly<{ status: 'unavailable' }>

export async function getAccountPurchases(
  userId: string,
): Promise<AccountPurchasesResolution> {
  try {
    return {
      purchases: await listPurchaseHistory(getDatabase().client, userId, 'en'),
      status: 'available',
    }
  } catch (error: unknown) {
    runtimeLogger.error('account.purchases.failed', {
      dependency: 'database',
      errorKind: error instanceof Error ? error.name : 'unknown',
      route: '/account',
    })
    return { status: 'unavailable' }
  }
}
