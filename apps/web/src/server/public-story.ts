import {
  createPublicStoryDetail,
  type PublicStoryDetail,
} from '@curiofold/content'
import {
  findPublishedStoryBySlug,
  type PublishedStoryLocalization,
  type PublishedStoryRouteResolution,
} from '@curiofold/db'
import { cache } from 'react'

import { getDatabase } from './database'

export type PublicStoryRouteData =
  | Readonly<{
      availableLocalizations: readonly PublishedStoryLocalization[]
      detail: PublicStoryDetail
      status: 'found'
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
