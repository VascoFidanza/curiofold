import { createReaderStory, type ReaderStory } from '@curiofold/content'
import {
  findEntitledStoryBySlug,
  findReadingProgress,
  type PublishedStoryLocalization,
  type ReadingProgressSnapshot,
} from '@curiofold/db'

import { getDatabase } from './database'

export type ReaderStoryRouteData =
  | Readonly<{
      progress: ReadingProgressSnapshot
      status: 'found'
      story: ReaderStory
      storyId: string
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

  const progress = await findReadingProgress(database, {
    currentStory: resolution.story,
    currentVersionId: resolution.versionId,
    locale,
    storyId: resolution.storyId,
    userId,
  })

  return {
    progress,
    status: 'found',
    story: createReaderStory(resolution.story),
    storyId: resolution.storyId,
    versionId: resolution.versionId,
  }
}
