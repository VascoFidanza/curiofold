import {
  compileStoryDocument,
  type CompiledStoryDocument,
} from '@curiofold/content'
import {
  remapReadingAnchor,
  resolveReadingProgress,
  type ReadingProgressAnchor,
  type ReadingProgressBlock,
} from '@curiofold/domain'
import { and, eq, inArray, isNotNull, min } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

type CuriofoldDatabase = NodePgDatabase<typeof schema>

export interface ReadingProgressSnapshot {
  readonly completedAt: string | null
  readonly highWaterPercent: number
  readonly lastClientSequence: number
  readonly resumeBlockId: string | null
  readonly resumeOffset: number
  readonly storyId: string
  readonly versionId: string
}

export interface SaveReadingProgressInput {
  readonly clientSequence: number
  readonly endMarkerReached: boolean
  readonly locale: string
  readonly now?: Date
  readonly resumeBlockId: string
  readonly resumeOffset: number
  readonly storyId: string
  readonly userId: string
  readonly versionId: string
}

export type SaveReadingProgressResult =
  | Readonly<{
      accepted: boolean
      progress: ReadingProgressSnapshot
      status: 'found'
    }>
  | Readonly<{ status: 'not_entitled' | 'not_found' }>

interface StoredProgress {
  readonly completedAt: Date | null
  readonly highWaterPercent: number
  readonly id: string
  readonly lastClientSequence: number
  readonly resumeBlockId: string | null
  readonly resumeOffset: number
  readonly versionId: string
}

function progressBlocks(
  story: CompiledStoryDocument,
): readonly ReadingProgressBlock[] {
  return story.document.blocks.map(({ id }) => ({
    id,
    readingUnits: story.readingUnits[id] ?? 0,
  }))
}

function serializeProgress(
  progress: Omit<ReadingProgressSnapshot, 'completedAt'> & {
    completedAt: Date | null
  },
): ReadingProgressSnapshot {
  return {
    ...progress,
    completedAt: progress.completedAt?.toISOString() ?? null,
  }
}

async function storyCompletion(
  database: CuriofoldDatabase,
  userId: string,
  storyId: string,
): Promise<Date | null> {
  const [completion] = await database
    .select({ completedAt: min(schema.readingProgress.completedAt) })
    .from(schema.readingProgress)
    .where(
      and(
        eq(schema.readingProgress.userId, userId),
        eq(schema.readingProgress.storyId, storyId),
        isNotNull(schema.readingProgress.completedAt),
      ),
    )

  return completion?.completedAt ?? null
}

async function normalizeStoredProgress(
  database: CuriofoldDatabase,
  stored: StoredProgress,
  storyId: string,
  userId: string,
  locale: string,
  currentVersionId: string,
  currentStory: CompiledStoryDocument,
): Promise<ReadingProgressSnapshot> {
  let anchor: ReadingProgressAnchor | null = stored.resumeBlockId
    ? { blockId: stored.resumeBlockId, offset: stored.resumeOffset }
    : null

  if (stored.versionId !== currentVersionId && anchor) {
    const [storedVersion] = await database
      .select({ document: schema.storyVersions.document })
      .from(schema.storyVersions)
      .innerJoin(
        schema.storyLocalizations,
        eq(schema.storyLocalizations.id, schema.storyVersions.localizationId),
      )
      .where(
        and(
          eq(schema.storyVersions.id, stored.versionId),
          eq(schema.storyLocalizations.storyId, storyId),
          eq(schema.storyLocalizations.locale, locale),
        ),
      )
      .limit(1)

    if (storedVersion) {
      anchor = remapReadingAnchor(
        progressBlocks(compileStoryDocument(storedVersion.document)),
        progressBlocks(currentStory),
        anchor,
      )
    } else {
      anchor = null
    }
  }

  return serializeProgress({
    completedAt:
      stored.completedAt ?? (await storyCompletion(database, userId, storyId)),
    highWaterPercent: stored.highWaterPercent,
    lastClientSequence: stored.lastClientSequence,
    resumeBlockId: anchor?.blockId ?? null,
    resumeOffset: anchor?.offset ?? 0,
    storyId,
    versionId: currentVersionId,
  })
}

export async function findReadingProgress(
  database: CuriofoldDatabase,
  input: Readonly<{
    currentStory: CompiledStoryDocument
    currentVersionId: string
    locale: string
    storyId: string
    userId: string
  }>,
): Promise<ReadingProgressSnapshot> {
  const [stored] = await database
    .select({
      completedAt: schema.readingProgress.completedAt,
      highWaterPercent: schema.readingProgress.highWaterPercent,
      id: schema.readingProgress.id,
      lastClientSequence: schema.readingProgress.lastClientSequence,
      resumeBlockId: schema.readingProgress.resumeBlockId,
      resumeOffset: schema.readingProgress.resumeOffset,
      versionId: schema.readingProgress.versionId,
    })
    .from(schema.readingProgress)
    .where(
      and(
        eq(schema.readingProgress.userId, input.userId),
        eq(schema.readingProgress.storyId, input.storyId),
        eq(schema.readingProgress.locale, input.locale),
      ),
    )
    .limit(1)

  if (!stored) {
    return serializeProgress({
      completedAt: await storyCompletion(database, input.userId, input.storyId),
      highWaterPercent: 0,
      lastClientSequence: 0,
      resumeBlockId: null,
      resumeOffset: 0,
      storyId: input.storyId,
      versionId: input.currentVersionId,
    })
  }

  return normalizeStoredProgress(
    database,
    stored,
    input.storyId,
    input.userId,
    input.locale,
    input.currentVersionId,
    input.currentStory,
  )
}

export async function saveReadingProgress(
  database: CuriofoldDatabase,
  input: SaveReadingProgressInput,
): Promise<SaveReadingProgressResult> {
  const now = input.now ?? new Date()

  return database.transaction(async (transaction) => {
    const [entitlement] = await transaction
      .select({ id: schema.storyEntitlements.id })
      .from(schema.storyEntitlements)
      .where(
        and(
          eq(schema.storyEntitlements.userId, input.userId),
          eq(schema.storyEntitlements.storyId, input.storyId),
          eq(schema.storyEntitlements.status, 'active'),
        ),
      )
      .limit(1)
    if (!entitlement) {
      return { status: 'not_entitled' as const }
    }

    const [localization] = await transaction
      .select({
        currentDocument: schema.storyVersions.document,
        currentVersionId: schema.storyVersions.id,
      })
      .from(schema.storyLocalizations)
      .innerJoin(
        schema.storyVersions,
        eq(
          schema.storyVersions.id,
          schema.storyLocalizations.currentPublishedVersionId,
        ),
      )
      .where(
        and(
          eq(schema.storyLocalizations.storyId, input.storyId),
          eq(schema.storyLocalizations.locale, input.locale),
          inArray(schema.storyLocalizations.state, ['published', 'archived']),
        ),
      )
      .limit(1)
    if (!localization) {
      return { status: 'not_found' as const }
    }

    const [sourceVersion] = await transaction
      .select({ document: schema.storyVersions.document })
      .from(schema.storyVersions)
      .innerJoin(
        schema.storyLocalizations,
        eq(schema.storyLocalizations.id, schema.storyVersions.localizationId),
      )
      .where(
        and(
          eq(schema.storyVersions.id, input.versionId),
          eq(schema.storyLocalizations.storyId, input.storyId),
          eq(schema.storyLocalizations.locale, input.locale),
        ),
      )
      .limit(1)
    if (!sourceVersion) {
      return { status: 'not_found' as const }
    }

    const currentStory = compileStoryDocument(localization.currentDocument)
    const sourceStory = compileStoryDocument(sourceVersion.document)
    if (
      currentStory.document.locale !== input.locale ||
      sourceStory.document.locale !== input.locale ||
      (currentStory.document.publication.state !== 'published' &&
        currentStory.document.publication.state !== 'archived') ||
      (sourceStory.document.publication.state !== 'published' &&
        sourceStory.document.publication.state !== 'archived')
    ) {
      return { status: 'not_found' as const }
    }

    await transaction
      .insert(schema.readingProgress)
      .values({
        locale: input.locale,
        storyId: input.storyId,
        userId: input.userId,
        versionId: localization.currentVersionId,
      })
      .onConflictDoNothing({
        target: [
          schema.readingProgress.userId,
          schema.readingProgress.storyId,
          schema.readingProgress.locale,
        ],
      })

    const [stored] = await transaction
      .select({
        completedAt: schema.readingProgress.completedAt,
        highWaterPercent: schema.readingProgress.highWaterPercent,
        id: schema.readingProgress.id,
        lastClientSequence: schema.readingProgress.lastClientSequence,
        resumeBlockId: schema.readingProgress.resumeBlockId,
        resumeOffset: schema.readingProgress.resumeOffset,
        versionId: schema.readingProgress.versionId,
      })
      .from(schema.readingProgress)
      .where(
        and(
          eq(schema.readingProgress.userId, input.userId),
          eq(schema.readingProgress.storyId, input.storyId),
          eq(schema.readingProgress.locale, input.locale),
        ),
      )
      .for('update')
      .limit(1)
    if (!stored) {
      throw new Error('Reading progress row could not be initialized.')
    }

    if (input.clientSequence <= stored.lastClientSequence) {
      return {
        accepted: false,
        progress: await normalizeStoredProgress(
          transaction,
          stored,
          input.storyId,
          input.userId,
          input.locale,
          localization.currentVersionId,
          currentStory,
        ),
        status: 'found' as const,
      }
    }

    const completedAt =
      stored.completedAt ??
      (await storyCompletion(transaction, input.userId, input.storyId))
    const resolved = resolveReadingProgress({
      anchor: {
        blockId: input.resumeBlockId,
        offset: input.resumeOffset,
      },
      completedAt,
      endMarkerReached: input.endMarkerReached,
      existingHighWaterPercent: stored.highWaterPercent,
      now,
      sourceBlocks: progressBlocks(sourceStory),
      targetBlocks: progressBlocks(currentStory),
    })

    const [updated] = await transaction
      .update(schema.readingProgress)
      .set({
        completedAt: resolved.completedAt,
        highWaterPercent: resolved.highWaterPercent,
        lastClientSequence: input.clientSequence,
        resumeBlockId: resolved.resumeAnchor?.blockId ?? null,
        resumeOffset: resolved.resumeAnchor?.offset ?? 0,
        updatedAt: now,
        versionId: localization.currentVersionId,
      })
      .where(eq(schema.readingProgress.id, stored.id))
      .returning({
        completedAt: schema.readingProgress.completedAt,
        highWaterPercent: schema.readingProgress.highWaterPercent,
        lastClientSequence: schema.readingProgress.lastClientSequence,
        resumeBlockId: schema.readingProgress.resumeBlockId,
        resumeOffset: schema.readingProgress.resumeOffset,
        versionId: schema.readingProgress.versionId,
      })
    if (!updated) {
      throw new Error('Reading progress update did not return a row.')
    }

    return {
      accepted: true,
      progress: serializeProgress({
        ...updated,
        storyId: input.storyId,
      }),
      status: 'found' as const,
    }
  })
}
