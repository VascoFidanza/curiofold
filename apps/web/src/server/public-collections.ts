import {
  createPublicStoryDetail,
  findCollectionDefinition,
  listCollectionDefinitions,
  type PublicStoryDetail,
} from '@curiofold/content'
import { listPublishedStoriesByCollection } from '@curiofold/db'
import { cache } from 'react'

import { getDatabase } from './database'
import { runtimeLogger } from './observability'

export interface PublicCollection {
  readonly key: string
  readonly locale: string
  readonly title: string
  readonly description: string
  readonly stories: readonly PublicStoryDetail[]
}

export type CollectionResolution =
  | Readonly<{ status: 'available'; collection: PublicCollection }>
  | Readonly<{ status: 'not_found' | 'unavailable' }>

export const getPublicCollection = cache(async function loadPublicCollection(
  locale: string,
  key: string,
): Promise<CollectionResolution> {
  const definition = findCollectionDefinition(locale, key)
  if (!definition) return { status: 'not_found' }

  try {
    const stories = (
      await listPublishedStoriesByCollection(getDatabase().client, locale, key)
    )
      .map(createPublicStoryDetail)
      .sort((left, right) => {
        const leftIndex = definition.storyOrder.indexOf(left.storyKey)
        const rightIndex = definition.storyOrder.indexOf(right.storyKey)
        return (
          (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
            (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex) ||
          left.title.localeCompare(right.title)
        )
      })
    if (stories.length === 0) return { status: 'not_found' }
    return { status: 'available', collection: { ...definition, stories } }
  } catch (error: unknown) {
    runtimeLogger.error('story.collection.failed', {
      dependency: 'database',
      errorKind: error instanceof Error ? error.name : 'unknown',
      route: '/[locale]/collections/[collectionKey]',
    })
    return { status: 'unavailable' }
  }
})

export async function getPublicCollections(
  locale: string,
): Promise<readonly PublicCollection[] | null> {
  const results = await Promise.all(
    listCollectionDefinitions(locale).map((item) =>
      getPublicCollection(locale, item.key),
    ),
  )
  if (results.some((result) => result.status === 'unavailable')) return null
  return results.flatMap((result) =>
    result.status === 'available' ? [result.collection] : [],
  )
}
