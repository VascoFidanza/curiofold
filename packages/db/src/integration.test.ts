import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { compileStoryDocument } from '@curiofold/content'
import { eq } from 'drizzle-orm'
import { Client } from 'pg'
import { describe, expect, it } from 'vitest'

import { createDatabase } from './client'
import {
  applyIdentityLifecycleEvent,
  ensureIdentityAccount,
  findIdentityAccount,
} from './identity'
import {
  findEntitledStoryBySlug,
  grantStoryEntitlement,
  revokeStoryEntitlement,
} from './entitlements'
import {
  findPublishedStory,
  findPublishedStoryBySlug,
} from './published-stories'
import {
  entitlementEvents,
  staffRoleAssignments,
  stories,
  storyLocalizations,
  storyVersions,
} from './schema'

const integrationEnabled = process.env.RUN_DB_INTEGRATION === '1'

async function loadStoryFixture(path: string) {
  return compileStoryDocument(
    JSON.parse(
      await readFile(
        fileURLToPath(
          new URL(
            `../../../content/stories/clockwork-gardens/${path}`,
            import.meta.url,
          ),
        ),
        'utf8',
      ),
    ) as unknown,
  )
}

describe.skipIf(!integrationEnabled)('PostgreSQL integration harness', () => {
  it('uses an isolated PostgreSQL 18 database', async () => {
    let connectionString = process.env.TEST_DATABASE_URL
    let stopDatabase = () => Promise.resolve()

    if (!connectionString) {
      const { GenericContainer, Wait } = await import('testcontainers')
      const container = await new GenericContainer('postgres:18-alpine')
        .withEnvironment({
          POSTGRES_DB: 'curiofold_test',
          POSTGRES_PASSWORD: 'curiofold_test',
          POSTGRES_USER: 'curiofold_test',
        })
        .withExposedPorts(5432)
        .withWaitStrategy(
          Wait.forLogMessage(
            /database system is ready to accept connections/,
            2,
          ),
        )
        .start()
      connectionString = `postgresql://curiofold_test:curiofold_test@${container.getHost()}:${String(container.getMappedPort(5432))}/curiofold_test`
      stopDatabase = () => container.stop().then(() => undefined)
    }

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
          'entitlement_events',
          'identity_events',
          'reading_progress',
          'staff_role_assignments',
          'stories',
          'story_entitlements',
          'story_localizations',
          'story_versions',
          'users',
        ]),
      )

      const authenticatedAt = new Date('2026-09-20T10:00:00.000Z')
      const linkedAccount = await ensureIdentityAccount(
        database.client,
        'user_identity_fixture',
        authenticatedAt,
      )
      expect(linkedAccount).toMatchObject({
        accountState: 'active',
        emailVerified: false,
        staffRoles: new Set(),
      })

      const createdEvent = {
        emailVerified: true,
        eventId: 'evt_identity_created',
        occurredAt: new Date('2026-09-20T10:01:00.000Z'),
        subject: 'user_identity_fixture',
        type: 'user.created' as const,
      }
      await expect(
        applyIdentityLifecycleEvent(database.client, createdEvent),
      ).resolves.toBe('applied')
      await expect(
        applyIdentityLifecycleEvent(database.client, createdEvent),
      ).resolves.toBe('duplicate')

      await database.client.insert(staffRoleAssignments).values({
        reason: 'Synthetic integration-test assignment.',
        role: 'publisher',
        userId: linkedAccount.userId,
      })
      await expect(
        findIdentityAccount(database.client, 'user_identity_fixture'),
      ).resolves.toMatchObject({
        accountState: 'active',
        emailVerified: true,
        staffRoles: new Set(['publisher']),
      })

      await expect(
        applyIdentityLifecycleEvent(database.client, {
          emailVerified: false,
          eventId: 'evt_identity_deleted',
          occurredAt: new Date('2026-09-20T10:03:00.000Z'),
          subject: 'user_identity_fixture',
          type: 'user.deleted',
        }),
      ).resolves.toBe('applied')
      await expect(
        applyIdentityLifecycleEvent(database.client, {
          emailVerified: true,
          eventId: 'evt_identity_stale_update',
          occurredAt: new Date('2026-09-20T10:02:00.000Z'),
          subject: 'user_identity_fixture',
          type: 'user.updated',
        }),
      ).resolves.toBe('ignored')
      await expect(
        findIdentityAccount(database.client, 'user_identity_fixture'),
      ).resolves.toMatchObject({
        accountState: 'disabled',
        emailVerified: false,
      })

      const original = await loadStoryFixture('en/1.json')
      const correction = await loadStoryFixture('en/2.json')
      const portugueseDraft = await loadStoryFixture('pt-PT/1.json')
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

      await database.client.insert(storyLocalizations).values({
        deck: portugueseDraft.document.metadata.deck,
        hook: portugueseDraft.document.metadata.hook,
        locale: portugueseDraft.document.locale,
        preview: portugueseDraft.document.metadata.preview,
        readingMinutes: portugueseDraft.document.metadata.readingMinutes,
        slug: portugueseDraft.document.slug,
        state: 'draft',
        storyId: story.id,
        title: portugueseDraft.document.metadata.title,
      })

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

      const routed = await findPublishedStoryBySlug(
        database.client,
        'en',
        'clockwork-gardens',
      )
      expect(routed.status).toBe('found')
      if (routed.status === 'found') {
        expect(routed.story.contentHash).toBe(correction.contentHash)
        expect(routed.availableLocalizations).toEqual([
          { locale: 'en', slug: 'clockwork-gardens' },
        ])
      }

      await expect(
        findEntitledStoryBySlug(
          database.client,
          linkedAccount.userId,
          'en',
          'clockwork-gardens',
        ),
      ).resolves.toEqual({ status: 'not_entitled' })

      const concurrentGrants = await Promise.all([
        grantStoryEntitlement(database.client, {
          actorUserId: linkedAccount.userId,
          grantedAt: new Date('2026-09-20T11:00:00.000Z'),
          reason: 'Synthetic Reader integration fixture.',
          source: 'seed',
          storyId: story.id,
          userId: linkedAccount.userId,
        }),
        grantStoryEntitlement(database.client, {
          actorUserId: linkedAccount.userId,
          grantedAt: new Date('2026-09-20T11:00:00.000Z'),
          reason: 'Duplicate synthetic Reader grant.',
          source: 'seed',
          storyId: story.id,
          userId: linkedAccount.userId,
        }),
      ])
      expect(concurrentGrants.filter(({ created }) => created)).toHaveLength(1)
      expect(
        new Set(concurrentGrants.map(({ entitlementId }) => entitlementId))
          .size,
      ).toBe(1)

      const grantEvents = await database.client
        .select({ reason: entitlementEvents.reason })
        .from(entitlementEvents)
        .where(
          eq(
            entitlementEvents.entitlementId,
            concurrentGrants[0].entitlementId,
          ),
        )
      expect(grantEvents).toHaveLength(1)

      const entitled = await findEntitledStoryBySlug(
        database.client,
        linkedAccount.userId,
        'en',
        'clockwork-gardens',
      )
      expect(entitled.status).toBe('found')
      if (entitled.status === 'found') {
        expect(entitled.story.document.blocks).toHaveLength(3)
        expect(entitled.story.document.blocks[1]).toMatchObject({
          id: 'correction-context',
          kind: 'source_note',
        })
      }

      const otherReader = await ensureIdentityAccount(
        database.client,
        'user_other_reader_fixture',
        new Date('2026-09-20T11:01:00.000Z'),
      )
      await expect(
        findEntitledStoryBySlug(
          database.client,
          otherReader.userId,
          'en',
          'clockwork-gardens',
        ),
      ).resolves.toEqual({ status: 'not_entitled' })

      const revoked = await revokeStoryEntitlement(database.client, {
        actorUserId: linkedAccount.userId,
        entitlementId: concurrentGrants[0].entitlementId,
        reason: 'Synthetic revocation evidence.',
        revokedAt: new Date('2026-09-20T11:02:00.000Z'),
      })
      expect(revoked).toMatchObject({ changed: true, status: 'revoked' })
      await expect(
        revokeStoryEntitlement(database.client, {
          actorUserId: linkedAccount.userId,
          entitlementId: revoked.entitlementId,
          reason: 'Duplicate synthetic revocation.',
          revokedAt: new Date('2026-09-20T11:02:00.000Z'),
        }),
      ).resolves.toEqual({
        changed: false,
        entitlementId: revoked.entitlementId,
        status: 'revoked',
      })
      await expect(
        findEntitledStoryBySlug(
          database.client,
          linkedAccount.userId,
          'en',
          'clockwork-gardens',
        ),
      ).resolves.toEqual({ status: 'not_entitled' })

      const entitlementHistory = await database.client
        .select({ eventType: entitlementEvents.eventType })
        .from(entitlementEvents)
        .where(
          eq(
            entitlementEvents.entitlementId,
            concurrentGrants[0].entitlementId,
          ),
        )
      expect(
        entitlementHistory.map(({ eventType }) => eventType).sort(),
      ).toEqual(['granted', 'revoked'])

      await expect(
        findPublishedStoryBySlug(database.client, 'pt-PT', 'clockwork-gardens'),
      ).resolves.toEqual({
        availableLocalizations: [{ locale: 'en', slug: 'clockwork-gardens' }],
        status: 'missing_locale',
      })
      await expect(
        findPublishedStoryBySlug(
          database.client,
          'pt-PT',
          'jardins-de-relogio',
        ),
      ).resolves.toEqual({ status: 'not_found' })
    } finally {
      await client.end()
      await database.pool.end()
      await stopDatabase()
    }
  }, 60_000)
})
