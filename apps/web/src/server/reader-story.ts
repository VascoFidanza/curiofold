import {
  createReaderStory,
  type ReaderStory,
  type RelatedStorySuggestion,
} from '@curiofold/content'
import {
  findEntitledStoryBySlug,
  findReadingProgress,
  listRelatedPublishedStories,
  type PublishedStoryLocalization,
  type ReadingProgressSnapshot,
} from '@curiofold/db'

import { getDatabase } from './database'
import { runtimeLogger } from './observability'

export type ReaderStoryRouteData =
  | Readonly<{
      progress: ReadingProgressSnapshot
      relatedStories: readonly RelatedStorySuggestion[]
      status: 'found'
      story: ReaderStory
      storyId: string
      userId: string
      versionId: string
    }>
  | Readonly<{
      status: 'not_entitled'
    }>
  | Readonly<{
      availableLocalizations: readonly PublishedStoryLocalization[]
      status: 'missing_locale'
    }>
  | Readonly<{
      status: 'not_found'
    }>

export async function getReaderStoryRoute(
  userId: string,
  locale: string,
  slug: string,
): Promise<ReaderStoryRouteData> {
  const database = getDatabase().client
  const resolution = await findEntitledStoryBySlug(
    database,
    userId,
    locale,
    slug,
  )

  if (resolution.status !== 'found') {
    return resolution
  }

  const [progress, relatedStories] = await Promise.all([
    findReadingProgress(database, {
      currentStory: resolution.story,
      currentVersionId: resolution.versionId,
      locale,
      storyId: resolution.storyId,
      userId,
    }),
    listRelatedPublishedStories(database, {
      categoryKeys: resolution.story.document.metadata.categoryKeys,
      currentStoryKey: resolution.story.document.storyKey,
      locale,
      relatedStoryKeys: resolution.story.document.metadata.relatedStoryKeys,
    }).catch((error: unknown) => {
      runtimeLogger.error('story.related.failed', {
        dependency: 'database',
        errorKind: error instanceof Error ? error.name : 'unknown',
        route: '/[locale]/stories/[slug]/read',
      })
      return []
    }),
  ])

  return {
    progress,
    relatedStories: relatedStories.map(({ basis, story }) => ({
      basis,
      hook: story.document.metadata.hook,
      locale: story.document.locale,
      slug: story.document.slug,
      title: story.document.metadata.title,
    })),
    status: 'found',
    story: createReaderStory(resolution.story),
    storyId: resolution.storyId,
    userId,
    versionId: resolution.versionId,
  }
}
