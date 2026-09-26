import {
  createPublicStoryDetail,
  type PublicStoryDetail,
} from '@curiofold/content'
import {
  findPublishedStoryBySlug,
  listPublishedStories,
  type PublishedStoryLocalization,
  type PublishedStoryRouteResolution,
} from '@curiofold/db'
import { cache } from 'react'

import { getDatabase } from './database'
import { runtimeLogger } from './observability'

export type PublicStoryRouteData =
  | Readonly<{
      availableLocalizations: readonly PublishedStoryLocalization[]
      detail: PublicStoryDetail
      status: 'found'
      storyId: string
    }>
  | Readonly<{
      availableLocalizations: readonly PublishedStoryLocalization[]
      status: 'missing_locale'
    }>
  | Readonly<{
      status: 'not_found'
    }>

export function projectPublicStoryRoute(
  resolution: PublishedStoryRouteResolution,
): PublicStoryRouteData {
  if (resolution.status !== 'found') {
    return resolution
  }

  return {
    availableLocalizations: resolution.availableLocalizations,
    detail: createPublicStoryDetail(resolution.story),
    status: 'found',
    storyId: resolution.storyId,
  }
}

async function loadPublicStoryRoute(
  locale: string,
  slug: string,
): Promise<PublicStoryRouteData> {
  const { client } = getDatabase()
  return projectPublicStoryRoute(
    await findPublishedStoryBySlug(client, locale, slug),
  )
}

export const getPublicStoryRoute = cache(loadPublicStoryRoute)

async function loadPublicStoryCards(locale: string) {
  const { client } = getDatabase()
  return (await listPublishedStories(client, locale)).map(
    createPublicStoryDetail,
  )
}

export async function getPublicStoryCards(
  locale: string,
): Promise<readonly PublicStoryDetail[]> {
  try {
    return await loadPublicStoryCards(locale)
  } catch (error: unknown) {
    runtimeLogger.error('story.catalog.failed', {
      dependency: 'database',
      errorKind: error instanceof Error ? error.name : 'unknown',
      route: '/',
    })
    return []
  }
}
