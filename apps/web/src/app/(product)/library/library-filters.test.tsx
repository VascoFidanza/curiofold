// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import type { LibraryStory } from '@curiofold/db'

import {
  filterLibraryStories,
  LibraryFilters,
  parseLibraryFilter,
} from './library-filters'

afterEach(cleanup)

const stories: readonly LibraryStory[] = [
  'unread',
  'in_progress',
  'completed',
].map((state) => ({
  completedAt: state === 'completed' ? '2026-10-01T00:00:00Z' : null,
  highWaterPercent: state === 'in_progress' ? 50 : 0,
  hook: 'A curious question',
  locale: 'en',
  readingMinutes: 3,
  slug: state,
  state: state as LibraryStory['state'],
  storyId: state,
  title: state,
}))

it('filters authoritative states without changing the shelf or its order', () => {
  expect(filterLibraryStories(stories, 'all')).toBe(stories)
  for (const state of ['unread', 'in_progress', 'completed'] as const) {
    expect(
      filterLibraryStories(stories, state).map(({ storyId }) => storyId),
    ).toEqual([state])
    expect(parseLibraryFilter(state)).toBe(state)
  }
  expect(filterLibraryStories([], 'in_progress')).toEqual([])
  for (const value of [undefined, 'invalid', ['completed', 'unread']]) {
    expect(parseLibraryFilter(value)).toBe('all')
  }
})

it('provides shareable filters with shelf counts and a unique current selection', () => {
  render(<LibraryFilters activeFilter="in_progress" stories={stories} />)
  expect(
    screen.getByRole('navigation', { name: 'Filter your Library' }),
  ).toBeTruthy()
  expect(
    screen.getByRole('link', { name: 'All (3)' }).getAttribute('href'),
  ).toBe('/library')
  const selected = screen.getByRole('link', {
    name: 'In progress (1)',
    current: 'page',
  })
  expect(selected.getAttribute('href')).toBe('/library?state=in_progress')
  expect(screen.getAllByRole('link', { current: 'page' })).toHaveLength(1)
  expect(screen.getByRole('link', { name: 'Unread (1)' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Completed (1)' })).toBeTruthy()
})
