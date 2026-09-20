import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import { compileStoryDocument } from './story-contract'
import { createReaderStory } from './reader-story'

const fixture = new URL(
  '../../../content/stories/clockwork-gardens/en/1.json',
  import.meta.url,
)

describe('private Reader Story projection', () => {
  it('projects every allowlisted block and source without storage or review internals', async () => {
    const story = compileStoryDocument(
      JSON.parse(await readFile(fixture, 'utf8')) as unknown,
    )
    const reader = createReaderStory(story)
    const serialized = JSON.stringify(reader)

    expect(reader.blocks.map(({ kind }) => kind)).toEqual([
      'paragraph',
      'section_heading',
      'image',
      'fact_box',
      'pull_quote',
      'source_note',
      'end_matter',
    ])
    expect(reader.totalReadingUnits).toBeGreaterThan(0)
    expect(reader.sources[0]?.url).toBe(
      'https://research.example.test/clockwork-gardens',
    )
    expect(serialized).not.toContain('objectKey')
    expect(serialized).not.toContain('fixtures/clockwork-gardens')
    expect(serialized).not.toContain('rightsBasis')
    expect(serialized).not.toContain('Synthetic Fixture Reviewer')
  })

  it('refuses to produce paid Reader content from a draft', async () => {
    const draft = compileStoryDocument(
      JSON.parse(
        await readFile(
          new URL(
            '../../../content/stories/clockwork-gardens/pt-PT/1.json',
            import.meta.url,
          ),
          'utf8',
        ),
      ) as unknown,
    )

    expect(() => createReaderStory(draft)).toThrow(
      'Only a published or archived Story may produce a Reader projection.',
    )
  })
})
