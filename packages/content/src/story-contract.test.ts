import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import {
  compileStoryDocument,
  resolvePublishedStory,
  StoryContractError,
} from './story-contract'

const fixtureRoot = new URL(
  '../../../content/stories/clockwork-gardens/',
  import.meta.url,
)

async function loadFixture(path: string): Promise<unknown> {
  return JSON.parse(
    await readFile(new URL(path, fixtureRoot), 'utf8'),
  ) as unknown
}

describe('StoryDocument contract', () => {
  it('compiles an allowlisted Story and computes deterministic reading evidence', async () => {
    const input = await loadFixture('en/1.json')
    const first = compileStoryDocument(input)
    const second = compileStoryDocument(input)

    expect(first.contentHash).toMatch(/^[a-f0-9]{64}$/)
    expect(first.contentHash).toBe(second.contentHash)
    expect(first.totalReadingUnits).toBeGreaterThan(0)
    expect(first.readingUnits.opening).toBeGreaterThan(0)
    expect(first.document.blocks.map((block) => block.kind)).toEqual([
      'paragraph',
      'section_heading',
      'image',
      'fact_box',
      'pull_quote',
      'source_note',
      'end_matter',
    ])
  })

  it('selects the newest published revision without changing Story identity', async () => {
    const revisionOne = compileStoryDocument(await loadFixture('en/1.json'))
    const revisionTwo = compileStoryDocument(await loadFixture('en/2.json'))
    const resolution = resolvePublishedStory(
      [revisionOne, revisionTwo],
      'clockwork-gardens',
      'en',
    )

    expect(revisionTwo.document.storyKey).toBe(revisionOne.document.storyKey)
    expect(revisionTwo.document.previousRevision).toBe(1)
    expect(revisionTwo.contentHash).not.toBe(revisionOne.contentHash)
    expect(resolution.status).toBe('found')
    if (resolution.status === 'found') {
      expect(resolution.story.document.revision).toBe(2)
    }
  })

  it('does not expose a draft locale as published', async () => {
    const english = compileStoryDocument(await loadFixture('en/2.json'))
    const portugueseDraft = compileStoryDocument(
      await loadFixture('pt-PT/1.json'),
    )
    const resolution = resolvePublishedStory(
      [english, portugueseDraft],
      'clockwork-gardens',
      'pt-PT',
    )

    expect(resolution).toEqual({
      availableLocales: ['en'],
      status: 'missing_locale',
    })
  })

  it('distinguishes an unknown Story from a missing locale', async () => {
    const english = compileStoryDocument(await loadFixture('en/2.json'))

    expect(resolvePublishedStory([english], 'unknown-story', 'en')).toEqual({
      status: 'not_found',
    })
  })

  it('rejects duplicate block identifiers and broken references', async () => {
    const valid = compileStoryDocument(await loadFixture('en/1.json')).document
    const duplicateBlock = structuredClone(valid)
    const firstBlock = duplicateBlock.blocks[0]
    const secondBlock = duplicateBlock.blocks[1]
    if (!firstBlock || !secondBlock) {
      throw new Error('Fixture requires at least two blocks.')
    }
    secondBlock.id = firstBlock.id

    expect(() => compileStoryDocument(duplicateBlock)).toThrow(
      new StoryContractError('Duplicate block id: opening'),
    )

    const brokenReference = structuredClone(valid)
    const opening = brokenReference.blocks[0]
    if (opening?.kind !== 'paragraph') {
      throw new Error('Fixture opening must remain a paragraph.')
    }
    opening.sourceIds = ['missing-source']

    expect(() => compileStoryDocument(brokenReference)).toThrow(
      'references unknown source: missing-source',
    )
  })

  it('rejects released content without accountable human review', async () => {
    const published = compileStoryDocument(
      await loadFixture('en/1.json'),
    ).document
    const unreviewed = structuredClone(published)
    unreviewed.editorial.reviewedBy = null
    unreviewed.editorial.reviewedAt = null

    expect(() => compileStoryDocument(unreviewed)).toThrow(
      'Released Stories require publication and accountable human review metadata.',
    )
  })

  it('rejects informative media without accessible alternative text', async () => {
    const published = compileStoryDocument(
      await loadFixture('en/1.json'),
    ).document
    const inaccessible = structuredClone(published)
    const media = inaccessible.media[0]
    if (!media) {
      throw new Error('Fixture requires media.')
    }
    media.alt = null

    expect(() => compileStoryDocument(inaccessible)).toThrow(
      'Informative media requires alt text.',
    )
  })

  it('rejects arbitrary executable or presentation fields', async () => {
    const published = compileStoryDocument(
      await loadFixture('en/1.json'),
    ).document
    const unsafeInput: unknown = {
      ...published,
      html: '<script>unsafe()</script>',
    }

    expect(() => compileStoryDocument(unsafeInput)).toThrow()
  })
})
