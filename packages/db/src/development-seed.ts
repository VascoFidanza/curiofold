import type { CompiledStoryDocument } from '@curiofold/content'
import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import * as schema from './schema'

type CuriofoldDatabase = NodePgDatabase<typeof schema>

export interface DevelopmentSeedDocument {
  readonly gitCommitSha: string
  readonly story: CompiledStoryDocument
}

export interface DevelopmentSeedResult {
  readonly createdLocalizations: number
  readonly createdStories: number
  readonly createdVersions: number
  readonly publishedLocalizations: number
}

interface MutableDevelopmentSeedResult {
  createdLocalizations: number
  createdStories: number
  createdVersions: number
  publishedLocalizations: number
}

interface SeedLocalization {
  readonly currentPublishedVersionId: string | null
  readonly deck: string
  readonly hook: string
  readonly id: string
  readonly preview: string
  readonly readingMinutes: number
  readonly slug: string
  readonly state: 'archived' | 'draft' | 'published' | 'withdrawn'
  readonly title: string
}

export class DevelopmentSeedConflictError extends Error {
  override readonly name = 'DevelopmentSeedConflictError'
}

function assertSeedDocument(document: DevelopmentSeedDocument): void {
  if (document.story.document.publication.state !== 'published') {
    throw new TypeError(
      'Development seed accepts published Story documents only.',
    )
  }
  if (!/^[a-f0-9]{40,64}$/iu.test(document.gitCommitSha)) {
    throw new TypeError('Development seed requires a Git commit SHA.')
  }
  if (
    !document.story.document.publication.publishedAt ||
    !document.story.document.editorial.reviewedAt
  ) {
    throw new TypeError(
      'Published development seed documents require publication and review timestamps.',
    )
  }
}

export function assertNonProductionSeedEnvironment(
  environment: string | undefined,
  confirmation: string | undefined,
): void {
  const permittedEnvironments = new Set(['local', 'preview', 'staging', 'test'])
  if (
    !environment ||
    !permittedEnvironments.has(environment) ||
    confirmation !== 'nonproduction'
  ) {
    throw new Error(
      'Development seeding requires an explicit non-production environment and CURIOFOLD_SEED_CONFIRMATION=nonproduction.',
    )
  }
}

export async function seedDevelopmentCatalog(
  database: CuriofoldDatabase,
  documents: readonly DevelopmentSeedDocument[],
): Promise<DevelopmentSeedResult> {
  if (documents.length === 0) {
    throw new TypeError(
      'Development seed requires at least one Story document.',
    )
  }
  for (const document of documents) assertSeedDocument(document)

  const grouped = new Map<string, DevelopmentSeedDocument[]>()
  for (const document of documents) {
    const key = `${document.story.document.storyKey}:${document.story.document.locale}`
    const group = grouped.get(key) ?? []
    group.push(document)
    grouped.set(key, group)
  }

  return database.transaction(async (transaction) => {
    const result: MutableDevelopmentSeedResult = {
      createdLocalizations: 0,
      createdStories: 0,
      createdVersions: 0,
      publishedLocalizations: 0,
    }

    for (const groupedDocuments of grouped.values()) {
      const orderedDocuments = [...groupedDocuments].sort(
        (left, right) =>
          left.story.document.revision - right.story.document.revision,
      )
      const latest = orderedDocuments.at(-1)
      if (!latest) throw new DevelopmentSeedConflictError()
      const { document: latestDocument } = latest.story

      const [existingStory] = await transaction
        .select({ id: schema.stories.id })
        .from(schema.stories)
        .where(eq(schema.stories.stableKey, latestDocument.storyKey))
        .limit(1)
      const story =
        existingStory ??
        (
          await transaction
            .insert(schema.stories)
            .values({ stableKey: latestDocument.storyKey })
            .returning({ id: schema.stories.id })
        )[0]
      if (!story) throw new DevelopmentSeedConflictError()
      if (!existingStory) result.createdStories += 1

      let [localization]: SeedLocalization[] = await transaction
        .select({
          currentPublishedVersionId:
            schema.storyLocalizations.currentPublishedVersionId,
          deck: schema.storyLocalizations.deck,
          hook: schema.storyLocalizations.hook,
          id: schema.storyLocalizations.id,
          preview: schema.storyLocalizations.preview,
          readingMinutes: schema.storyLocalizations.readingMinutes,
          slug: schema.storyLocalizations.slug,
          state: schema.storyLocalizations.state,
          title: schema.storyLocalizations.title,
        })
        .from(schema.storyLocalizations)
        .where(
          and(
            eq(schema.storyLocalizations.storyId, story.id),
            eq(schema.storyLocalizations.locale, latestDocument.locale),
          ),
        )
        .limit(1)
      if (!localization) {
        const [createdLocalization] = await transaction
          .insert(schema.storyLocalizations)
          .values({
            deck: latestDocument.metadata.deck,
            hook: latestDocument.metadata.hook,
            locale: latestDocument.locale,
            preview: latestDocument.metadata.preview,
            readingMinutes: latestDocument.metadata.readingMinutes,
            slug: latestDocument.slug,
            state: 'draft',
            storyId: story.id,
            title: latestDocument.metadata.title,
          })
          .returning()
        if (!createdLocalization) throw new DevelopmentSeedConflictError()
        localization = createdLocalization
        result.createdLocalizations += 1
      }

      for (const seedDocument of orderedDocuments) {
        const { document } = seedDocument.story
        const publishedAt = document.publication.publishedAt
        const reviewedAt = document.editorial.reviewedAt
        if (!publishedAt || !reviewedAt) {
          throw new DevelopmentSeedConflictError(
            'Published development seed timestamps are missing.',
          )
        }
        const [existingVersion] = await transaction
          .select({ contentHash: schema.storyVersions.contentHash })
          .from(schema.storyVersions)
          .where(
            and(
              eq(schema.storyVersions.localizationId, localization.id),
              eq(schema.storyVersions.revision, document.revision),
            ),
          )
          .limit(1)
        if (existingVersion) {
          if (existingVersion.contentHash !== seedDocument.story.contentHash) {
            throw new DevelopmentSeedConflictError(
              `Seed version ${document.storyKey}/${document.locale}@${String(document.revision)} conflicts with immutable history.`,
            )
          }
          continue
        }
        await transaction.insert(schema.storyVersions).values({
          contentHash: seedDocument.story.contentHash,
          document,
          gitCommitSha: seedDocument.gitCommitSha,
          localizationId: localization.id,
          publishedAt: new Date(publishedAt),
          revision: document.revision,
          reviewedAt: new Date(reviewedAt),
          reviewedBy: document.editorial.reviewedBy,
          schemaVersion: document.schemaVersion,
        })
        result.createdVersions += 1
      }

      const [publishedVersion] = await transaction
        .select({ id: schema.storyVersions.id })
        .from(schema.storyVersions)
        .where(
          and(
            eq(schema.storyVersions.localizationId, localization.id),
            eq(schema.storyVersions.revision, latestDocument.revision),
          ),
        )
        .limit(1)
      if (!publishedVersion) throw new DevelopmentSeedConflictError()
      const requiresPublicationUpdate =
        localization.currentPublishedVersionId !== publishedVersion.id ||
        localization.deck !== latestDocument.metadata.deck ||
        localization.hook !== latestDocument.metadata.hook ||
        localization.preview !== latestDocument.metadata.preview ||
        localization.readingMinutes !==
          latestDocument.metadata.readingMinutes ||
        localization.slug !== latestDocument.slug ||
        localization.state !== 'published' ||
        localization.title !== latestDocument.metadata.title
      if (requiresPublicationUpdate) {
        await transaction
          .update(schema.storyLocalizations)
          .set({
            currentPublishedVersionId: publishedVersion.id,
            deck: latestDocument.metadata.deck,
            hook: latestDocument.metadata.hook,
            preview: latestDocument.metadata.preview,
            readingMinutes: latestDocument.metadata.readingMinutes,
            slug: latestDocument.slug,
            state: 'published',
            title: latestDocument.metadata.title,
            updatedAt: new Date(),
          })
          .where(eq(schema.storyLocalizations.id, localization.id))
        result.publishedLocalizations += 1
      }
    }

    return result
  })
}
