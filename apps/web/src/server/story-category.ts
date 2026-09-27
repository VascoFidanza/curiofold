import {
  createPublicStoryDetail,
  type PublicStoryDetail,
} from '@curiofold/content'
import { listPublishedStoriesByCategory } from '@curiofold/db'
import { cache } from 'react'

import { getDatabase } from './database'
import { runtimeLogger } from './observability'

export type PublicCategoryResolution =
  | Readonly<{ status: 'available'; stories: readonly PublicStoryDetail[] }>
  | Readonly<{ status: 'unavailable' }>

export const getPublicCategoryStories = cache(
  async function loadPublicCategoryStories(
    locale: string,
    categoryKey: string,
  ): Promise<PublicCategoryResolution> {
    try {
      return {
        status: 'available',
        stories: (
          await listPublishedStoriesByCategory(
            getDatabase().client,
            locale,
            categoryKey,
          )
        ).map(createPublicStoryDetail),
      }
    } catch (error: unknown) {
      runtimeLogger.error('story.category.failed', {
        dependency: 'database',
        errorKind: error instanceof Error ? error.name : 'unknown',
        route: '/[locale]/categories/[categoryKey]',
      })
      return { status: 'unavailable' }
    }
  },
)
