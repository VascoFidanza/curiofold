// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import type { LibraryStory } from '@curiofold/db'
import { afterEach, describe, expect, it } from 'vitest'

import { LibraryProgress } from './library-progress'

afterEach(cleanup)

function story(state: LibraryStory['state']): LibraryStory {
  return {
    completedAt: state === 'completed' ? '2026-09-28T00:00:00Z' : null,
    highWaterPercent: state === 'completed' ? 100 : 0,
    hook: 'A curious question',
    locale: 'en',
    readingMinutes: 3,
    slug: state,
    state,
    storyId: state,
    title: state,
  }
}

describe('LibraryProgress', () => {
  it('summarizes only the owned Stories in the authoritative Library snapshot', () => {
    render(
      <LibraryProgress
        stories={[story('completed'), story('in_progress'), story('unread')]}
      />,
    )

    expect(
      screen.getByRole('region', { name: 'Your reading progress' }),
    ).toBeTruthy()
    expect(
      screen.getByText('1 of 3 Stories on this shelf completed.'),
    ).toBeTruthy()
    expect(
      screen.getByText('Stories on this shelf').nextElementSibling?.textContent,
    ).toBe('3')
    expect(screen.getByText('Completed').nextElementSibling?.textContent).toBe(
      '1',
    )
    expect(
      screen.getByText('In progress').nextElementSibling?.textContent,
    ).toBe('1')
  })

  it('shows honest zeroes for an empty Library', () => {
    render(<LibraryProgress stories={[]} />)

    expect(
      screen.getByText('0 of 0 Stories on this shelf completed.'),
    ).toBeTruthy()
    expect(
      screen.getByText('Stories on this shelf').nextElementSibling?.textContent,
    ).toBe('0')
  })
})
