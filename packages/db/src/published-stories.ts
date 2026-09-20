import {
  compileStoryDocument,
  type CompiledStoryDocument,
  type PublishedStoryResolution,
} from '@curiofold/content'
import { and, asc, eq, isNotNull } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

type CuriofoldDatabase = NodePgDatabase<typeof schema>

export interface PublishedStoryLocalization {
  readonly locale: string
  readonly slug: string
}

export type PublishedStoryRouteResolution =
  | Readonly<{
      availableLocalizations: readonly PublishedStoryLocalization[]
      status: 'found'
      story: CompiledStoryDocument
    }>
  | Readonly<{
      availableLocalizations: readonly PublishedStoryLocalization[]
      status: 'missing_locale'
    }>
  | Readonly<{
      status: 'not_found'
    }>

async function listPublishedLocalizations(
  database: CuriofoldDatabase,
  storyId: string,
): Promise<readonly PublishedStoryLocalization[]> {
  return database
    .select({
      locale: schema.storyLocalizations.locale,
      slug: schema.storyLocalizations.slug,
    })
    .from(schema.storyLocalizations)
    .where(
      and(
        eq(schema.storyLocalizations.storyId, storyId),
        eq(schema.storyLocalizations.state, 'published'),
        isNotNull(schema.storyLocalizations.currentPublishedVersionId),
      ),
    )
    .orderBy(asc(schema.storyLocalizations.locale))
}

export async function findPublishedStory(
  database: CuriofoldDatabase,
  storyKey: string,
  locale: string,
): Promise<PublishedStoryResolution> {
  const [localized] = await database
    .select({ document: schema.storyVersions.document })
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
        eq(schema.stories.stableKey, storyKey),
        eq(schema.storyLocalizations.locale, locale),
        eq(schema.storyLocalizations.state, 'published'),
      ),
    )
    .limit(1)

  if (localized) {
    const story = compileStoryDocument(localized.document)
    if (
      story.document.storyKey !== storyKey ||
      story.document.locale !== locale ||
      story.document.publication.state !== 'published'
    ) {
      throw new Error(
        'Published Story projection does not match its requested identity.',
      )
    }

    return {
      status: 'found',
      story,
    }
  }

  const availableLocales = await database
    .select({ locale: schema.storyLocalizations.locale })
    .from(schema.stories)
    .innerJoin(
      schema.storyLocalizations,
      eq(schema.storyLocalizations.storyId, schema.stories.id),
    )
    .where(
      and(
        eq(schema.stories.stableKey, storyKey),
        eq(schema.storyLocalizations.state, 'published'),
        isNotNull(schema.storyLocalizations.currentPublishedVersionId),
      ),
    )
    .orderBy(asc(schema.storyLocalizations.locale))

  if (availableLocales.length === 0) {
    return { status: 'not_found' }
  }

  return {
    availableLocales: availableLocales.map(
      ({ locale: availableLocale }) => availableLocale,
    ),
    status: 'missing_locale',
  }
}

export async function findPublishedStoryBySlug(
  database: CuriofoldDatabase,
  locale: string,
  slug: string,
): Promise<PublishedStoryRouteResolution> {
  const [localized] = await database
    .select({
      document: schema.storyVersions.document,
      storyId: schema.stories.id,
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
        eq(schema.storyLocalizations.locale, locale),
        eq(schema.storyLocalizations.slug, slug),
        eq(schema.storyLocalizations.state, 'published'),
      ),
    )
    .limit(1)

  if (localized) {
    const story = compileStoryDocument(localized.document)
    if (
      story.document.locale !== locale ||
      story.document.slug !== slug ||
      story.document.publication.state !== 'published'
    ) {
      throw new Error(
        'Published Story projection does not match its requested route.',
      )
    }

    return {
      availableLocalizations: await listPublishedLocalizations(
        database,
        localized.storyId,
      ),
      status: 'found',
      story,
    }
  }

  const storyCandidates = await database
    .selectDistinct({ storyId: schema.stories.id })
    .from(schema.stories)
    .innerJoin(
      schema.storyLocalizations,
      eq(schema.storyLocalizations.storyId, schema.stories.id),
    )
    .where(
      and(
        eq(schema.storyLocalizations.slug, slug),
        eq(schema.storyLocalizations.state, 'published'),
        isNotNull(schema.storyLocalizations.currentPublishedVersionId),
      ),
    )
    .limit(2)

  const [candidate] = storyCandidates
  if (!candidate || storyCandidates.length !== 1) {
    return { status: 'not_found' }
  }

  return {
    availableLocalizations: await listPublishedLocalizations(
      database,
      candidate.storyId,
    ),
    status: 'missing_locale',
  }
}
