// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { afterEach, describe, expect, it } from 'vitest'

import type { ReaderStory } from '@curiofold/content'

import { StoryReader } from './story-reader'

const story: ReaderStory = {
  blocks: [
    {
      id: 'opening',
      kind: 'paragraph',
      readingUnits: 12,
      sourceIds: ['source-one'],
      text: 'The garden aligns at noon.',
    },
    {
      id: 'mechanism',
      kind: 'section_heading',
      level: 2,
      readingUnits: 4,
      text: 'An imagined mechanism',
    },
    {
      alt: 'A labelled diagram of interlocking garden paths.',
      attribution: 'Curiofold synthetic fixture',
      caption: 'A synthetic diagram.',
      decorative: false,
      id: 'diagram',
      kind: 'image',
      readingUnits: 12,
      sourceIds: [],
    },
    {
      body: 'This is intentionally fictional.',
      id: 'fact',
      kind: 'fact_box',
      readingUnits: 6,
      sourceIds: ['source-one'],
      title: 'Fixture fact',
    },
    {
      attribution: 'Synthetic narrator',
      id: 'quote',
      kind: 'pull_quote',
      readingUnits: 6,
      sourceIds: ['source-one'],
      text: 'The garden never tells time the same way twice.',
    },
    {
      id: 'note',
      kind: 'source_note',
      readingUnits: 7,
      sourceIds: ['source-one'],
      text: 'The source is a synthetic engineering fixture.',
    },
    {
      id: 'end',
      kind: 'end_matter',
      links: [],
      readingUnits: 6,
      text: 'You reached the end.',
      title: 'Continue exploring',
    },
  ],
  categoryKeys: ['design-history'],
  deck: 'A synthetic Story used to verify the Reader boundary.',
  locale: 'en',
  methodologyNote: 'This fixture makes no factual claim.',
  publishedAt: '2026-09-01T09:00:00+00:00',
  readingMinutes: 2,
  revision: 1,
  reviewedAt: '2026-08-31T16:00:00+00:00',
  slug: 'clockwork-gardens',
  sources: [
    {
      accessedAt: '2026-08-30',
      authors: ['Curiofold Engineering'],
      doi: null,
      id: 'source-one',
      isbn: null,
      publishedAt: '2026-08-29',
      publisher: 'Curiofold',
      title: 'Synthetic fixture reference',
      url: 'https://research.example.test/clockwork-gardens',
    },
  ],
  storyKey: 'clockwork-gardens',
  title: 'Clockwork Gardens',
  totalReadingUnits: 53,
  updateNote: null,
}
const storyId = '11111111-1111-4111-8111-111111111111'
const versionId = '22222222-2222-4222-8222-222222222222'
const progress = {
  completedAt: null,
  highWaterPercent: 0,
  lastClientSequence: 0,
  resumeBlockId: null,
  resumeOffset: 0,
  storyId,
  versionId,
}

afterEach(() => {
  document.body.innerHTML = ''
  window.localStorage.clear()
})

describe('Story Reader', () => {
  it('renders semantic Story blocks and accessible source navigation', () => {
    render(
      <StoryReader
        progress={progress}
        story={story}
        storyId={storyId}
        versionId={versionId}
      />,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: story.title }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Sources & notes' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('img', {
        name: 'A labelled diagram of interlocking garden paths.',
      }),
    ).toBeTruthy()
    expect(
      screen
        .getAllByRole('link', { name: /Source 1: Synthetic fixture/u })[0]
        ?.getAttribute('href'),
    ).toBe('#source-source-one')
    expect(
      screen.getByRole('link', { name: 'Visit source' }).getAttribute('target'),
    ).toBe('_blank')
    expect(document.body.textContent).not.toMatch(/pdf|download/iu)
  })

  it('applies and persists the simple Reader preferences', () => {
    const { container } = render(
      <StoryReader
        progress={progress}
        story={story}
        storyId={storyId}
        versionId={versionId}
      />,
    )

    fireEvent.click(screen.getByLabelText('Reading settings'))
    fireEvent.click(screen.getByRole('button', { name: 'Larger' }))
    fireEvent.click(screen.getByRole('button', { name: 'Wide' }))

    const shell = container.firstElementChild
    expect(shell?.getAttribute('data-reader-text-size')).toBe('large')
    expect(shell?.getAttribute('data-reader-width')).toBe('wide')
    expect(window.localStorage.getItem('curiofold.reader.preferences.v1')).toBe(
      JSON.stringify({ textSize: 'large', width: 'wide' }),
    )
  })

  it('has no detectable automated accessibility violations', async () => {
    const { container } = render(
      <StoryReader
        progress={progress}
        story={story}
        storyId={storyId}
        versionId={versionId}
      />,
    )
    const result = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    })

    expect(result.violations).toEqual([])
  })
})
