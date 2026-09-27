import {
  compileStoryDocument,
  type CompiledStoryDocument,
} from '@curiofold/content'
import { and, eq, inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'
import { listPublishedStoriesByCategory } from './published-stories'

type CuriofoldDatabase = NodePgDatabase<typeof schema>

export interface RelatedPublishedStory {
  readonly basis: 'editorial' | 'shared_category'
  readonly story: CompiledStoryDocument
}

/** Explicit editorial order wins; category overlap is a bounded fallback. */
export async function listRelatedPublishedStories(
  database: CuriofoldDatabase,
  input: Readonly<{
    categoryKeys: readonly string[]
    currentStoryKey: string
    locale: string
    relatedStoryKeys: readonly string[]
  }>,
  limit = 3,
): Promise<readonly RelatedPublishedStory[]> {
  if (!input.locale.trim() || !input.currentStoryKey.trim()) {
    throw new TypeError('Related Story identity and locale are required.')
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 6) {
    throw new RangeError('Related Story limit must be from 1 to 6.')
  }

  const explicitKeys = [...new Set(input.relatedStoryKeys)]
    .filter((key) => key !== input.currentStoryKey)
    .slice(0, 20)
  const explicitRows = explicitKeys.length
    ? await database
        .select({
          document: schema.storyVersions.document,
          stableKey: schema.stories.stableKey,
        })
        .from(schema.stories)
        .innerJoin(
          schema.storyLocalizations,
          eq(schema.storyLocalizations.storyId, schema.stories.id),
        )
        .innerJoin(
          schema.storyVersions,
          eq(
            schema.storyVersions.id,
            schema.storyLocalizations.currentPublishedVersionId,
          ),
        )
        .where(
          and(
            inArray(schema.stories.stableKey, explicitKeys),
            eq(schema.storyLocalizations.locale, input.locale),
            eq(schema.storyLocalizations.state, 'published'),
          ),
        )
    : []

  const byKey = new Map(
    explicitRows.map(({ document, stableKey }) => {
      const story = compileStoryDocument(document)
      if (
        story.document.storyKey !== stableKey ||
        story.document.locale !== input.locale ||
        story.document.publication.state !== 'published'
      ) {
        throw new Error('Related Story projection is invalid.')
      }
      return [stableKey, story] as const
    }),
  )
  const results: RelatedPublishedStory[] = explicitKeys.flatMap((key) => {
    const story = byKey.get(key)
    return story ? [{ basis: 'editorial', story }] : []
  })
  if (results.length >= limit) return results.slice(0, limit)

  const firstCategory = input.categoryKeys[0]
  if (firstCategory) {
    const categoryStories = await listPublishedStoriesByCategory(
      database,
      input.locale,
      firstCategory,
    )
    const included = new Set([
      input.currentStoryKey,
      ...results.map(({ story }) => story.document.storyKey),
    ])
    for (const story of categoryStories) {
      if (included.has(story.document.storyKey)) continue
      results.push({ basis: 'shared_category', story })
      included.add(story.document.storyKey)
      if (results.length >= limit) break
    }
  }
  return results
}
