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
const storyId = '00000000-0000-4000-8000-000000000001'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('public Story Detail', () => {
  it('renders public credibility, preview and a contextual sign-in path', () => {
    render(
      <main>
        <StoryDetail
          detail={detail}
          purchase={{ status: 'anonymous' }}
          storyId={storyId}
        />
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
      screen
        .getByRole('link', { name: 'Sign in to unlock' })
        .getAttribute('href'),
    ).toBe('/sign-in?redirect_url=%2Fen%2Fstories%2Fclockwork-gardens')
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
          purchase={{ status: 'anonymous' }}
          storyId={storyId}
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
        <StoryDetail
          detail={detail}
          purchase={{ status: 'anonymous' }}
          storyId={storyId}
        />
      </main>,
    )
    const result = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })

    expect(result.violations).toEqual([])
  })

  it('distinguishes owned, zero-credit and unavailable states', () => {
    const { rerender } = render(
      <StoryDetail
        detail={detail}
        purchase={{ status: 'owned', readingState: 'in_progress' }}
        storyId={storyId}
      />,
    )
    expect(
      screen
        .getByRole('link', { name: 'Continue reading' })
        .getAttribute('href'),
    ).toBe('/en/stories/clockwork-gardens/read')
    expect(screen.queryByText('Unlock for 1 credit')).toBeNull()

    rerender(
      <StoryDetail
        detail={detail}
        purchase={{ status: 'unowned', availableCredits: 0, canUnlock: true }}
        storyId={storyId}
      />,
    )
    expect(
      screen
        .getByRole('link', { name: 'Add credits to continue' })
        .getAttribute('href'),
    ).toBe('/credits?return=%2Fen%2Fstories%2Fclockwork-gardens')

    rerender(
      <StoryDetail
        detail={detail}
        purchase={{ status: 'unavailable' }}
        storyId={storyId}
      />,
    )
    expect(
      screen.getByText(/Ownership is temporarily unavailable/u),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Unlock for 1 credit' }),
    ).toBeNull()
  })
})
