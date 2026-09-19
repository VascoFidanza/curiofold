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

      const fixture = compileStoryDocument(
        JSON.parse(
          await readFile(
            fileURLToPath(
              new URL(
                '../../../content/stories/clockwork-gardens/en/2.json',
                import.meta.url,
              ),
            ),
            'utf8',
          ),
        ) as unknown,
      )
      const [story] = await database.client
        .insert(stories)
        .values({ stableKey: fixture.document.storyKey })
        .returning({ id: stories.id })

      if (!story) {
        throw new Error('Expected Story insertion to return an id.')
      }

      const [localization] = await database.client
        .insert(storyLocalizations)
        .values({
          deck: fixture.document.metadata.deck,
          hook: fixture.document.metadata.hook,
          locale: fixture.document.locale,
          preview: fixture.document.metadata.preview,
          readingMinutes: fixture.document.metadata.readingMinutes,
          slug: fixture.document.slug,
          state: 'draft',
          storyId: story.id,
          title: fixture.document.metadata.title,
        })
        .returning({ id: storyLocalizations.id })

      if (!localization) {
        throw new Error(
          'Expected Story localization insertion to return an id.',
        )
      }

      const publishedAt = fixture.document.publication.publishedAt
      const reviewedAt = fixture.document.editorial.reviewedAt
      if (!publishedAt || !reviewedAt) {
        throw new Error(
          'Published fixture requires publication and review dates.',
        )
      }

      const [version] = await database.client
        .insert(storyVersions)
        .values({
          contentHash: fixture.contentHash,
          document: fixture.document,
          gitCommitSha: 'a'.repeat(40),
          localizationId: localization.id,
          publishedAt: new Date(publishedAt),
          revision: fixture.document.revision,
          reviewedAt: new Date(reviewedAt),
          reviewedBy: fixture.document.editorial.reviewedBy,
          schemaVersion: fixture.document.schemaVersion,
        })
        .returning({ id: storyVersions.id })

      if (!version) {
        throw new Error('Expected Story version insertion to return an id.')
      }

      await database.client
        .update(storyLocalizations)
        .set({
          currentPublishedVersionId: version.id,
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
        expect(found.story.contentHash).toBe(fixture.contentHash)
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
