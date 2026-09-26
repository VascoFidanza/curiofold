import {
  compileStoryDocument,
  type CompiledStoryDocument,
  type PublishedStoryResolution,
} from '@curiofold/content'
import { and, asc, desc, eq, ilike, isNotNull, or } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

type CuriofoldDatabase = NodePgDatabase<typeof schema>

export interface PublishedStoryLocalization {
  readonly locale: string
  readonly slug: string
}

export interface PublishedStorySearchResult {
  readonly deck: string
  readonly hook: string
  readonly locale: string
  readonly readingMinutes: number
  readonly slug: string
  readonly title: string
}

function escapeSearchTerm(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
}

export async function searchPublishedStories(
  database: CuriofoldDatabase,
  locale: string,
  query: string,
  limit = 24,
): Promise<readonly PublishedStorySearchResult[]> {
  const normalizedQuery = query.trim()
  if (!locale.trim()) throw new TypeError('Story search locale is required.')
  if (normalizedQuery.length < 2 || normalizedQuery.length > 100) return []
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new RangeError('Story search limit must be an integer from 1 to 50.')
  }

  const pattern = `%${escapeSearchTerm(normalizedQuery)}%`
  return database
    .select({
      deck: schema.storyLocalizations.deck,
      hook: schema.storyLocalizations.hook,
      locale: schema.storyLocalizations.locale,
      readingMinutes: schema.storyLocalizations.readingMinutes,
      slug: schema.storyLocalizations.slug,
      title: schema.storyLocalizations.title,
    })
    .from(schema.stories)
    .innerJoin(
      schema.storyLocalizations,
      eq(schema.storyLocalizations.storyId, schema.stories.id),
    )
    .where(
      and(
        eq(schema.storyLocalizations.locale, locale),
        eq(schema.storyLocalizations.state, 'published'),
        isNotNull(schema.storyLocalizations.currentPublishedVersionId),
        or(
          ilike(schema.storyLocalizations.title, pattern),
          ilike(schema.storyLocalizations.deck, pattern),
          ilike(schema.storyLocalizations.hook, pattern),
          ilike(schema.storyLocalizations.preview, pattern),
        ),
      ),
    )
    .orderBy(asc(schema.storyLocalizations.title))
    .limit(limit)
}

export type PublishedStoryRouteResolution =
  | Readonly<{
      availableLocalizations: readonly PublishedStoryLocalization[]
      status: 'found'
      story: CompiledStoryDocument
      storyId: string
    }>
  | Readonly<{
      availableLocalizations: readonly PublishedStoryLocalization[]
      status: 'missing_locale'
    }>
  | Readonly<{
      status: 'not_found'
    }>

export async function listPublishedStories(
  database: CuriofoldDatabase,
  locale: string,
  limit = 12,
): Promise<readonly CompiledStoryDocument[]> {
  if (!locale.trim()) throw new TypeError('Story listing locale is required.')
  if (!Number.isInteger(limit) || limit < 1 || limit > 24) {
    throw new RangeError('Story listing limit must be an integer from 1 to 24.')
  }

  const rows = await database
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
        eq(schema.storyLocalizations.locale, locale),
        eq(schema.storyLocalizations.state, 'published'),
        isNotNull(schema.storyLocalizations.currentPublishedVersionId),
      ),
    )
    .orderBy(
      desc(schema.storyLocalizations.updatedAt),
      asc(schema.storyLocalizations.title),
    )
    .limit(limit)

  return rows.map(({ document }) => {
    const story = compileStoryDocument(document)
    if (
      story.document.locale !== locale ||
      story.document.publication.state !== 'published'
    ) {
      throw new Error('Published Story listing returned an invalid projection.')
    }
    return story
  })
}
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
      storyId: localized.storyId,
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
