import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import { compileStoryDocument } from './story-contract'
import { createPublicStoryDetail } from './public-story'

const fixtureRoot = new URL(
  '../../../content/stories/clockwork-gardens/',
  import.meta.url,
)

async function loadFixture(path: string): Promise<unknown> {
  return JSON.parse(
    await readFile(new URL(path, fixtureRoot), 'utf8'),
  ) as unknown
}

describe('public Story detail projection', () => {
  it('contains approved metadata and selected preview blocks only', async () => {
    const story = compileStoryDocument(await loadFixture('en/1.json'))
    const detail = createPublicStoryDetail(story)
    const serialized = JSON.stringify(detail)

    expect(detail.previewBlocks).toEqual([
      {
        id: 'opening',
        kind: 'paragraph',
        text: 'At noon, every path in the fictional garden aligned for a single minute.',
      },
    ])
    expect(detail.credibility).toEqual({
      reviewedAt: '2026-08-31T16:00:00+00:00',
      sourceCount: 1,
    })
    expect(serialized).not.toContain('An imagined mechanism')
    expect(serialized).not.toContain('garden-diagram')
    expect(serialized).not.toContain('research.example.test')
    expect(serialized).not.toContain('Synthetic Fixture Reviewer')
    expect(serialized).not.toContain('sourceIds')
    expect(serialized).not.toContain('blocks')
  })

  it('refuses to project a draft locale', async () => {
    const draft = compileStoryDocument(await loadFixture('pt-PT/1.json'))

    expect(() => createPublicStoryDetail(draft)).toThrow(
      'Only a published Story may produce a public detail projection.',
    )
  })
})
