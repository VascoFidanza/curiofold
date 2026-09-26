import { can, type AuthorizationContext } from '@curiofold/domain'
import {
  findOwnedStoryState,
  findWalletBalance,
  type LibraryStoryState,
} from '@curiofold/db'

import { getDatabase } from './database'
import {
  IdentitySessionError,
  isClerkSessionConfigured,
  requireAuthorizationContext,
} from './identity'
import { runtimeLogger } from './observability'

export type StoryPurchaseState =
  | Readonly<{ status: 'anonymous' | 'disabled' | 'unavailable' }>
  | Readonly<{ status: 'owned'; readingState: LibraryStoryState }>
  | Readonly<{
      status: 'unowned'
      availableCredits: number
      canUnlock: boolean
    }>

export async function resolveStoryPurchaseState(
  storyId: string,
  locale: string,
  dependencies: Readonly<{
    authorizationSource?: () => Promise<AuthorizationContext>
    ownedSource?: (
      userId: string,
      storyId: string,
      locale: string,
    ) => Promise<LibraryStoryState | null>
    balanceSource?: (userId: string) => Promise<number>
    configured?: boolean
  }> = {},
): Promise<StoryPurchaseState> {
  if (!(dependencies.configured ?? isClerkSessionConfigured())) {
    return { status: 'unavailable' }
  }

  let authorization: AuthorizationContext
  try {
    authorization = await (
      dependencies.authorizationSource ?? requireAuthorizationContext
    )()
  } catch (error) {
    if (error instanceof IdentitySessionError) {
      if (error.code === 'unauthenticated') return { status: 'anonymous' }
      if (error.code === 'account_disabled') return { status: 'disabled' }
      return { status: 'unavailable' }
    }
    throw error
  }

  try {
    const owned = await (
      dependencies.ownedSource ??
      ((userId, id, language) =>
        findOwnedStoryState(getDatabase().client, userId, id, language))
    )(authorization.userId, storyId, locale)
    if (owned) return { status: 'owned', readingState: owned }

    const availableCredits = await (
      dependencies.balanceSource ??
      (async (userId) =>
        (await findWalletBalance(getDatabase().client, userId))
          .availableCredits)
    )(authorization.userId)
    return {
      status: 'unowned',
      availableCredits,
      canUnlock: can(authorization, 'story.unlock'),
    }
  } catch (error) {
    runtimeLogger.error('story.purchase_state.failed', {
      dependency: 'database',
      errorKind: error instanceof Error ? error.name : 'unknown',
      route: 'story-detail',
    })
    return { status: 'unavailable' }
  }
}
