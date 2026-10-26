import { expect } from 'vitest'
import type { Client } from 'pg'
import type { StoryDocument } from '@curiofold/content'

import { createDatabase } from './client'
import { exportAccountData } from './account-export'
import { releaseReviewedStory } from './story-publication'

/** Disposable local/container role only; never applied to shared infrastructure. */
export async function assertPublicationRoleIntegration(
  client: Client,
  connectionString: string,
  source: StoryDocument,
  correction: StoryDocument,
  financialUserId: string,
) {
  await client.query('CREATE ROLE curiofold_publisher NOLOGIN')
  await client.query('GRANT USAGE ON SCHEMA public TO curiofold_publisher')
  await client.query(
    'GRANT SELECT, INSERT ON stories, story_localizations, story_versions TO curiofold_publisher',
  )
  await client.query(
    'GRANT UPDATE ON story_localizations TO curiofold_publisher',
  )
  await client.query('GRANT INSERT ON audit_events TO curiofold_publisher')
  const url = new URL(connectionString)
  // This harness is already authenticated as the disposable cluster owner. Set
  // the session role at startup so every pooled connection uses these grants.
  url.searchParams.set('options', '-c role=curiofold_publisher')
  const publisher = createDatabase(url.toString())
  const owner = createDatabase(connectionString)
  const financialBefore = await exportAccountData(owner.client, financialUserId)
  const document = {
    ...source,
    storyKey: 'publisher-role-rehearsal',
    slug: 'publisher-role-rehearsal',
  }
  const input = {
    action: 'publish' as const,
    document,
    expectedCurrent: null,
    gitCommitSha: 'a'.repeat(40),
    operator: 'github:VascoFidanza',
    reason: 'Isolated publisher-role rehearsal.',
  }
  try {
    await expect(
      releaseReviewedStory(publisher.client, input),
    ).resolves.toMatchObject({ outcome: 'released' })
    await expect(
      releaseReviewedStory(publisher.client, input),
    ).resolves.toMatchObject({ outcome: 'unchanged' })
    await releaseReviewedStory(publisher.client, {
      ...input,
      document: {
        ...correction,
        storyKey: document.storyKey,
        slug: document.slug,
      },
      expectedCurrent: { revision: source.revision, state: 'published' },
    })
    await releaseReviewedStory(publisher.client, {
      ...input,
      expectedCurrent: { revision: correction.revision, state: 'published' },
    })
    await expect(
      releaseReviewedStory(publisher.client, {
        ...input,
        action: 'archive',
        expectedCurrent: { revision: source.revision, state: 'published' },
      }),
    ).resolves.toMatchObject({ outcome: 'released' })
    await expect(
      releaseReviewedStory(publisher.client, {
        ...input,
        expectedCurrent: { revision: source.revision, state: 'archived' },
      }),
    ).resolves.toMatchObject({ outcome: 'released' })
    for (const statement of [
      'SELECT * FROM users LIMIT 1',
      'SELECT * FROM payment_orders LIMIT 1',
      'UPDATE wallet_accounts SET balance_cached = 0',
      'DELETE FROM story_entitlements',
      'DELETE FROM story_versions',
      'UPDATE audit_events SET reason = reason',
    ])
      await expect(publisher.pool.query(statement)).rejects.toMatchObject({
        code: '42501',
      })
    // Missing audit authority must roll the entire publication back.
    await client.query('REVOKE INSERT ON audit_events FROM curiofold_publisher')
    await expect(
      releaseReviewedStory(publisher.client, {
        ...input,
        document: {
          ...source,
          storyKey: 'publisher-failure-rehearsal',
          slug: 'publisher-failure-rehearsal',
        },
      }),
    ).rejects.toThrow()
    expect(
      (
        await client.query<{ count: string }>(
          "SELECT count(*) FROM stories WHERE stable_key = 'publisher-failure-rehearsal'",
        )
      ).rows[0]?.count,
    ).toBe('0')
    const financialAfter = await exportAccountData(
      owner.client,
      financialUserId,
    )
    expect({ ...financialAfter, exportedAt: null }).toEqual({
      ...financialBefore,
      exportedAt: null,
    })
  } finally {
    await publisher.pool.end()
    await owner.pool.end()
  }
}
