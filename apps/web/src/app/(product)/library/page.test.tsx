import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import LibraryPage from './page'

vi.mock('@/server/identity', () => ({
  IdentitySessionError: class extends Error {},
  isClerkSessionConfigured: () => true,
  requireAuthorizationContext: () => Promise.resolve({ userId: 'reader-one' }),
}))
const getLibraryStories = vi.hoisted(() => vi.fn())
vi.mock('@/server/library', () => ({ getLibraryStories }))

it('offers all-owned recovery when the selected state has no matches', async () => {
  getLibraryStories.mockResolvedValue({
    status: 'available',
    stories: [
      {
        completedAt: '2026-10-01T00:00:00Z',
        highWaterPercent: 100,
        hook: 'A curious question',
        locale: 'en',
        readingMinutes: 3,
        slug: 'completed-story',
        state: 'completed',
        storyId: 'owned-story',
        title: 'An owned Story',
      },
    ],
  })
  const html = renderToStaticMarkup(
    await LibraryPage({ searchParams: Promise.resolve({ state: 'unread' }) }),
  )
  expect(getLibraryStories).toHaveBeenCalledWith('reader-one', 'en')
  expect(html).not.toContain('An owned Story')
  expect(html).toContain('No Stories match this filter yet.')
  expect(html).toContain('href="/library"')
  expect(html).toContain('Show all owned Stories')
  expect(html).toContain('1 of 1 Stories on this shelf completed.')
})
