import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

type CuriofoldDatabase = NodePgDatabase<typeof schema>

export type LibraryStoryState = 'completed' | 'in_progress' | 'unread'

export interface LibraryStory {
  readonly completedAt: string | null
  readonly highWaterPercent: number
  readonly hook: string
  readonly locale: string
  readonly readingMinutes: number
  readonly slug: string
  readonly state: LibraryStoryState
  readonly storyId: string
  readonly title: string
}

export async function listLibraryStories(
  database: CuriofoldDatabase,
  userId: string,
  locale: string,
): Promise<readonly LibraryStory[]> {
  if (!userId.trim()) throw new TypeError('Library user id is required.')
  if (!locale.trim()) throw new TypeError('Library locale is required.')

  const rows = await database
    .select({
      completedAt: schema.readingProgress.completedAt,
      highWaterPercent: schema.readingProgress.highWaterPercent,
      hook: schema.storyLocalizations.hook,
      locale: schema.storyLocalizations.locale,
      readingMinutes: schema.storyLocalizations.readingMinutes,
      slug: schema.storyLocalizations.slug,
      storyId: schema.stories.id,
      title: schema.storyLocalizations.title,
    })
    .from(schema.storyEntitlements)
    .innerJoin(
      schema.stories,
      eq(schema.stories.id, schema.storyEntitlements.storyId),
    )
    .innerJoin(
      schema.storyLocalizations,
      eq(schema.storyLocalizations.storyId, schema.stories.id),
    )
    .leftJoin(
      schema.readingProgress,
      and(
        eq(schema.readingProgress.userId, schema.storyEntitlements.userId),
        eq(schema.readingProgress.storyId, schema.stories.id),
        eq(schema.readingProgress.locale, schema.storyLocalizations.locale),
      ),
    )
    .where(
      and(
        eq(schema.storyEntitlements.userId, userId),
        eq(schema.storyEntitlements.status, 'active'),
        eq(schema.storyLocalizations.locale, locale),
        inArray(schema.storyLocalizations.state, ['published', 'archived']),
        isNotNull(schema.storyLocalizations.currentPublishedVersionId),
      ),
    )
    .orderBy(
      desc(schema.readingProgress.updatedAt),
      desc(schema.storyEntitlements.updatedAt),
    )

  return rows.map((row) => ({
    completedAt: row.completedAt?.toISOString() ?? null,
    highWaterPercent: row.highWaterPercent ?? 0,
    hook: row.hook,
    locale: row.locale,
    readingMinutes: row.readingMinutes,
    slug: row.slug,
    state: row.completedAt
      ? 'completed'
      : row.highWaterPercent && row.highWaterPercent > 0
        ? 'in_progress'
        : 'unread',
    storyId: row.storyId,
    title: row.title,
  }))
}
