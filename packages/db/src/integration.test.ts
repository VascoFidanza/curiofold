import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { compileStoryDocument } from '@curiofold/content'
import { eq } from 'drizzle-orm'
import { Client } from 'pg'
import { describe, expect, it } from 'vitest'

import { createDatabase } from './client.js'
import { findPublishedStory } from './published-stories.js'
import { stories, storyLocalizations, storyVersions } from './schema.js'

const integrationEnabled = process.env.RUN_DB_INTEGRATION === '1'

async function loadStoryFixture(revision: number) {
  return compileStoryDocument(
    JSON.parse(
      await readFile(
        fileURLToPath(
          new URL(
            `../../../content/stories/clockwork-gardens/en/${String(revision)}.json`,
            import.meta.url,
          ),
        ),
        'utf8',
      ),
    ) as unknown,
  )
}

describe.skipIf(!integrationEnabled)('PostgreSQL integration harness', () => {
  it('is reserved for an isolated Testcontainers database', async () => {
    const { GenericContainer, Wait } = await import('testcontainers')
    const container = await new GenericContainer('postgres:18-alpine')
      .withEnvironment({
        POSTGRES_DB: 'curiofold_test',
        POSTGRES_PASSWORD: 'curiofold_test',
        POSTGRES_USER: 'curiofold_test',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(
        Wait.forLogMessage(/database system is ready to accept connections/, 2),
      )
      .start()

    const connectionString = `postgresql://curiofold_test:curiofold_test@${container.getHost()}:${String(container.getMappedPort(5432))}/curiofold_test`
    const client = new Client({ connectionString })
    const database = createDatabase(connectionString)

    try {
      await client.connect()
      const migrationDirectory = fileURLToPath(
        new URL('../drizzle', import.meta.url),
      )
      const migrationFiles = (await readdir(migrationDirectory))
        .filter((file) => file.endsWith('.sql'))
        .sort()

      for (const migrationFile of migrationFiles) {
        const migration = await readFile(
          `${migrationDirectory}/${migrationFile}`,
          'utf8',
        )
        for (const statement of migration.split('--> statement-breakpoint')) {
          if (statement.trim()) {
            await client.query(statement)
          }
        }
      }

      const tables = await client.query<{ table_name: string }>(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public'
         ORDER BY table_name`,
      )

      expect(tables.rows.map((row) => row.table_name)).toEqual(
        expect.arrayContaining([
          'audit_events',
          'reading_progress',
          'stories',
          'story_localizations',
          'story_versions',
          'users',
        ]),
      )

      const original = await loadStoryFixture(1)
      const correction = await loadStoryFixture(2)
      const [story] = await database.client
        .insert(stories)
        .values({ stableKey: correction.document.storyKey })
        .returning({ id: stories.id })

      if (!story) {
        throw new Error('Expected Story insertion to return an id.')
      }

      const [localization] = await database.client
        .insert(storyLocalizations)
        .values({
          deck: correction.document.metadata.deck,
          hook: correction.document.metadata.hook,
          locale: correction.document.locale,
          preview: correction.document.metadata.preview,
          readingMinutes: correction.document.metadata.readingMinutes,
          slug: correction.document.slug,
          state: 'draft',
          storyId: story.id,
          title: correction.document.metadata.title,
        })
        .returning({ id: storyLocalizations.id })

      if (!localization) {
        throw new Error(
          'Expected Story localization insertion to return an id.',
        )
      }

      const originalPublishedAt = original.document.publication.publishedAt
      const originalReviewedAt = original.document.editorial.reviewedAt
      const correctionPublishedAt = correction.document.publication.publishedAt
      const correctionReviewedAt = correction.document.editorial.reviewedAt
      if (
        !originalPublishedAt ||
        !originalReviewedAt ||
        !correctionPublishedAt ||
        !correctionReviewedAt
      ) {
        throw new Error(
          'Published fixture requires publication and review dates.',
        )
      }

      const [originalVersion] = await database.client
        .insert(storyVersions)
        .values({
          contentHash: original.contentHash,
          document: original.document,
          gitCommitSha: 'a'.repeat(40),
          localizationId: localization.id,
          publishedAt: new Date(originalPublishedAt),
          revision: original.document.revision,
          reviewedAt: new Date(originalReviewedAt),
          reviewedBy: original.document.editorial.reviewedBy,
          schemaVersion: original.document.schemaVersion,
        })
        .returning({ id: storyVersions.id })

      if (!originalVersion) {
        throw new Error(
          'Expected original Story version insertion to return an id.',
        )
      }

      const [correctedVersion] = await database.client
        .insert(storyVersions)
        .values({
          contentHash: correction.contentHash,
          document: correction.document,
          gitCommitSha: 'b'.repeat(40),
          localizationId: localization.id,
          previousVersionId: originalVersion.id,
          publishedAt: new Date(correctionPublishedAt),
          revision: correction.document.revision,
          reviewedAt: new Date(correctionReviewedAt),
          reviewedBy: correction.document.editorial.reviewedBy,
          schemaVersion: correction.document.schemaVersion,
        })
        .returning({ id: storyVersions.id })

      if (!correctedVersion) {
        throw new Error(
          'Expected corrected Story version insertion to return an id.',
        )
      }

      await database.client
        .update(storyLocalizations)
        .set({
          currentPublishedVersionId: correctedVersion.id,
          state: 'published',
        })
        .where(eq(storyLocalizations.id, localization.id))

      const found = await findPublishedStory(
        database.client,
        'clockwork-gardens',
        'en',
      )
      expect(found.status).toBe('found')
      if (found.status === 'found') {
        expect(found.story.contentHash).toBe(correction.contentHash)
        expect(found.story.document.revision).toBe(2)
      }

      await expect(
        findPublishedStory(database.client, 'clockwork-gardens', 'pt-PT'),
      ).resolves.toEqual({
        availableLocales: ['en'],
        status: 'missing_locale',
      })
      await expect(
        findPublishedStory(database.client, 'unknown-story', 'en'),
      ).resolves.toEqual({ status: 'not_found' })
    } finally {
      await client.end()
      await database.pool.end()
      await container.stop()
    }
  }, 60_000)
})
