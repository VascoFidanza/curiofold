import {
  compileStoryDocument,
  type PublishedStoryResolution,
} from '@curiofold/content'
import { and, asc, eq, isNotNull } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema.js'

type CuriofoldDatabase = NodePgDatabase<typeof schema>

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
