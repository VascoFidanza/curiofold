import { listLibraryStories, type LibraryStory } from '@curiofold/db'

import { getDatabase } from './database'
import { runtimeLogger } from './observability'

export type LibraryResolution =
  | Readonly<{ status: 'available'; stories: readonly LibraryStory[] }>
  | Readonly<{ status: 'unavailable' }>

export async function getLibraryStories(
  userId: string,
  locale: string,
): Promise<LibraryResolution> {
  try {
    return {
      status: 'available',
      stories: await listLibraryStories(getDatabase().client, userId, locale),
    }
  } catch (error: unknown) {
    runtimeLogger.error('library.request.failed', {
      dependency: 'database',
      errorKind: error instanceof Error ? error.name : 'unknown',
      route: '/library',
    })
    return { status: 'unavailable' }
  }
}
