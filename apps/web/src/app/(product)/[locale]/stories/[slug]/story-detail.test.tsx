// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { afterEach, describe, expect, it } from 'vitest'

import type { PublicStoryDetail } from '@curiofold/content'

import { MissingStoryLocale, StoryDetail } from './story-detail'

const detail: PublicStoryDetail = {
  categoryKeys: ['design-history'],
  credibility: {
    reviewedAt: '2026-08-31T16:00:00+00:00',
    sourceCount: 1,
  },
  deck: 'A synthetic Story fixture for the public detail boundary.',
  hook: 'What if a garden kept time?',
  locale: 'en',
  preview: 'A deliberately short public description.',
  previewBlocks: [
    {
      id: 'opening',
      kind: 'paragraph',
      text: 'At noon, every path aligned for a single minute.',
    },
  ],
  publishedAt: '2026-09-01T09:00:00+00:00',
  readingMinutes: 2,
  revision: 1,
  slug: 'clockwork-gardens',
  storyKey: 'clockwork-gardens',
  title: 'Clockwork Gardens',
  updateNote: null,
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('public Story Detail', () => {
  it('renders public credibility, preview and a non-operational unlock state', () => {
    render(
      <main>
        <StoryDetail detail={detail} />
      </main>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: detail.title }),
    ).toBeTruthy()
    expect(screen.getByText('2 min')).toBeTruthy()
    expect(screen.getByText('1 source recorded')).toBeTruthy()
    expect(
      screen.getByText('At noon, every path aligned for a single minute.'),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Unlock for 1 credit' }),
    ).toHaveProperty('disabled', true)
    expect(document.body.textContent).not.toContain(
      'The garden never tells time',
    )
  })

  it('shows available locales without falling back to their Story content', () => {
    render(
      <main>
        <MissingStoryLocale
          availableLocalizations={[{ locale: 'en', slug: 'clockwork-gardens' }]}
          requestedLocale="pt-PT"
        />
      </main>,
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'This Story is not available in pt-PT yet.',
      }),
    ).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: /Read in English/u })
        .getAttribute('href'),
    ).toBe('/en/stories/clockwork-gardens')
    expect(document.body.textContent).not.toContain(detail.title)
  })

  it('keeps an image description available while public media delivery is pending', () => {
    render(
      <main>
        <StoryDetail
          detail={{
            ...detail,
            previewBlocks: [
              {
                alt: 'A labelled diagram of the fictional garden mechanism.',
                caption: 'A synthetic preview diagram.',
                id: 'garden-diagram',
                kind: 'image',
              },
            ],
          }}
        />
      </main>,
    )

    expect(
      screen.getByText('A labelled diagram of the fictional garden mechanism.'),
    ).toBeTruthy()
    expect(screen.getByText('A synthetic preview diagram.')).toBeTruthy()
  })

  it('has no detectable automated accessibility violations', async () => {
    const { container } = render(
      <main>
        <StoryDetail detail={detail} />
      </main>,
    )
    const result = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })

    expect(result.violations).toEqual([])
  })
})
