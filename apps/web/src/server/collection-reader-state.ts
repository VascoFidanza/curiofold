import type { LibraryStory } from '@curiofold/db'

import {
  IdentitySessionError,
  isClerkSessionConfigured,
  requireAuthorizationContext,
} from './identity'
import { getLibraryStories } from './library'
import { runtimeLogger } from './observability'

export type CollectionReaderState =
  | Readonly<{ status: 'anonymous' | 'unavailable' }>
  | Readonly<{ status: 'available'; stories: readonly LibraryStory[] }>

export async function getCollectionReaderState(
  locale: string,
): Promise<CollectionReaderState> {
  if (!isClerkSessionConfigured()) return { status: 'anonymous' }

  try {
    const context = await requireAuthorizationContext()
    return await getLibraryStories(context.userId, locale)
  } catch (error: unknown) {
    if (
      error instanceof IdentitySessionError &&
      error.code === 'unauthenticated'
    ) {
      return { status: 'anonymous' }
    }
    runtimeLogger.error('collection.reader_state.failed', {
      errorKind: error instanceof Error ? error.name : 'unknown',
      route: '/collections',
    })
    return { status: 'unavailable' }
  }
}
