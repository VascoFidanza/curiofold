import { createReaderStory, type ReaderStory } from '@curiofold/content'
import {
  findEntitledStoryBySlug,
  type PublishedStoryLocalization,
} from '@curiofold/db'

import { getDatabase } from './database'

export type ReaderStoryRouteData =
  | Readonly<{
      status: 'found'
      story: ReaderStory
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
  const resolution = await findEntitledStoryBySlug(
    getDatabase().client,
    userId,
    locale,
    slug,
  )

  if (resolution.status !== 'found') {
    return resolution
  }

  return {
    status: 'found',
    story: createReaderStory(resolution.story),
  }
}
