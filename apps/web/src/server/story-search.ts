import {
  searchPublishedStories,
  type PublishedStorySearchResult,
} from '@curiofold/db'

import { getDatabase } from './database'
import { runtimeLogger } from './observability'

export async function getPublicStorySearch(
  locale: string,
  query: string,
): Promise<readonly PublishedStorySearchResult[]> {
  try {
    return await searchPublishedStories(getDatabase().client, locale, query)
  } catch (error: unknown) {
    runtimeLogger.error('story.search.failed', {
      dependency: 'database',
      errorKind: error instanceof Error ? error.name : 'unknown',
      route: '/search',
    })
    return []
  }
}
