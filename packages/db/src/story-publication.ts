import { compileStoryDocument } from '@curiofold/content'
import { and, eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { seedDevelopmentCatalog } from './development-seed'
import * as schema from './schema'

export interface StoryPublicationInput {
  readonly action: 'publish' | 'archive'
  readonly document: unknown
  readonly expectedCurrent: Readonly<{ revision: number; state: string }> | null
  readonly gitCommitSha: string
  readonly operator: string
  readonly reason: string
}

export class StoryPublicationConflictError extends Error {
  override readonly name = 'StoryPublicationConflictError'
}

/** Privileged operator operation, deliberately not exposed through a public API. */
export async function releaseReviewedStory(
  database: NodePgDatabase<typeof schema>,
  input: StoryPublicationInput,
) {
  const story = compileStoryDocument(input.document)
  const document = story.document
  if (
    !['publish', 'archive'].includes(input.action) ||
    !/^[a-f0-9]{40,64}$/iu.test(input.gitCommitSha) ||
    /^0+$/u.test(input.gitCommitSha) ||
    !input.operator.trim() ||
    input.operator.length > 240 ||
    !input.reason.trim() ||
    input.reason.length > 1000 ||
    document.publication.state !== 'published'
  )
    throw new TypeError(
      'A reviewed published document, Git SHA, operator and reason are required.',
    )

  return database.transaction(async (transaction) => {
    // Publication is rare; one transaction-scoped lock covers creation and pointer changes.
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(913741, 1)`)
    const [current] = await transaction
      .select({
        id: schema.storyLocalizations.id,
        state: schema.storyLocalizations.state,
        slug: schema.storyLocalizations.slug,
        revision: schema.storyVersions.revision,
        contentHash: schema.storyVersions.contentHash,
      })
      .from(schema.storyLocalizations)
      .innerJoin(
        schema.stories,
        eq(schema.stories.id, schema.storyLocalizations.storyId),
      )
      .leftJoin(
        schema.storyVersions,
        eq(
          schema.storyVersions.id,
          schema.storyLocalizations.currentPublishedVersionId,
        ),
      )
      .where(
        and(
          eq(schema.stories.stableKey, document.storyKey),
          eq(schema.storyLocalizations.locale, document.locale),
        ),
      )
      .limit(1)
    const targetState = input.action === 'archive' ? 'archived' : 'published'
    if (
      current?.revision === document.revision &&
      current.contentHash === story.contentHash &&
      current.state === targetState
    ) {
      return { outcome: 'unchanged' as const, revision: document.revision }
    }
    if (
      (current
        ? !input.expectedCurrent ||
          current.revision !== input.expectedCurrent.revision ||
          current.state !== input.expectedCurrent.state
        : input.expectedCurrent !== null) ||
      (current && current.slug !== document.slug) ||
      current?.state === 'withdrawn' ||
      (input.action === 'archive' && current?.revision !== document.revision)
    )
      throw new StoryPublicationConflictError(
        'Publication state changed; refresh the manifest. Slug changes and withdrawn Story restoration require separate review.',
      )

    if (document.previousRevision !== null) {
      if (!current)
        throw new StoryPublicationConflictError(
          'Publish the predecessor first.',
        )
      const [predecessor] = await transaction
        .select({ id: schema.storyVersions.id })
        .from(schema.storyVersions)
        .where(
          and(
            eq(schema.storyVersions.localizationId, current.id),
            eq(schema.storyVersions.revision, document.previousRevision),
          ),
        )
        .limit(1)
      if (!predecessor)
        throw new StoryPublicationConflictError(
          'Publish the predecessor first.',
        )
    }
    // The existing importer checks immutable hashes and atomically projects safe metadata.
    // Its nested transaction is a savepoint; publication and audit commit together.
    await seedDevelopmentCatalog(transaction, [
      { gitCommitSha: input.gitCommitSha, story },
    ])
    const [localization] = await transaction
      .select({ id: schema.storyLocalizations.id })
      .from(schema.storyLocalizations)
      .innerJoin(
        schema.stories,
        eq(schema.stories.id, schema.storyLocalizations.storyId),
      )
      .where(
        and(
          eq(schema.stories.stableKey, document.storyKey),
          eq(schema.storyLocalizations.locale, document.locale),
        ),
      )
      .limit(1)
    if (!localization)
      throw new StoryPublicationConflictError('Publication projection missing.')
    if (input.action === 'archive')
      await transaction
        .update(schema.storyLocalizations)
        .set({ state: 'archived', updatedAt: new Date() })
        .where(eq(schema.storyLocalizations.id, localization.id))
    await transaction.insert(schema.auditEvents).values({
      action: `story.${input.action}`,
      targetType: 'story_localization',
      targetId: localization.id,
      reason: input.reason,
      metadata: {
        operator: input.operator,
        gitCommitSha: input.gitCommitSha,
        contentHash: story.contentHash,
        previous: input.expectedCurrent,
        revision: document.revision,
      },
    })
    return { outcome: 'released' as const, revision: document.revision }
  })
}
