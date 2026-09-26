import { findWalletHistory, type WalletHistoryPage } from '@curiofold/db'

import { getDatabase } from './database'
import { runtimeLogger } from './observability'

export type AccountWalletResolution =
  | Readonly<{ status: 'available'; wallet: WalletHistoryPage }>
  | Readonly<{ status: 'unavailable' }>

export async function getAccountWallet(
  userId: string,
): Promise<AccountWalletResolution> {
  try {
    return {
      status: 'available',
      wallet: await findWalletHistory(getDatabase().client, userId, {
        limit: 10,
      }),
    }
  } catch (error: unknown) {
    runtimeLogger.error('account.wallet.failed', {
      dependency: 'database',
      errorKind: error instanceof Error ? error.name : 'unknown',
      route: '/account',
    })
    return { status: 'unavailable' }
  }
}
