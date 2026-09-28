import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CollectionsPage from './page'
import CollectionPage from '../[locale]/collections/[collectionKey]/page'

const mockCollections = vi.hoisted(() => ({
  list: vi.fn(),
  one: vi.fn(),
  reader: vi.fn(),
}))

vi.mock('@/server/public-collections', () => ({
  getPublicCollections: mockCollections.list,
  getPublicCollection: mockCollections.one,
}))
vi.mock('@/server/collection-reader-state', () => ({
  getCollectionReaderState: mockCollections.reader,
}))

const collection = {
  key: 'synthetic-fixtures',
  locale: 'en',
  title: 'Sample Stories',
  description: 'Synthetic Stories for testing.',
  stories: [
    {
      storyKey: 'clockwork-gardens',
      readingMinutes: 2,
      slug: 'clockwork-gardens',
      title: 'Clockwork Gardens',
      hook: 'What if a garden kept time?',
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCollections.reader.mockResolvedValue({ status: 'anonymous' })
})

describe('public Collections', () => {
  it('lists only the published collection projection and links to its detail', async () => {
    mockCollections.list.mockResolvedValue([collection])
    const html = renderToStaticMarkup(await CollectionsPage())
    expect(html).toContain('Sample Stories')
    expect(html).toContain('1 Story')
    expect(html).toContain('/en/collections/synthetic-fixtures')
    expect(html).not.toContain('paid body')
  })

  it('links collection members to public previews without exposing paid bodies', async () => {
    mockCollections.one.mockResolvedValue({ status: 'available', collection })
    const html = renderToStaticMarkup(
      await CollectionPage({
        params: Promise.resolve({
          collectionKey: 'synthetic-fixtures',
          locale: 'en',
        }),
      }),
    )
    expect(html).toContain('Clockwork Gardens')
    expect(html).toContain('/en/stories/clockwork-gardens')
    expect(html).not.toContain('paid body')
  })

  it('shows an honest empty state instead of a broken navigation target', async () => {
    mockCollections.list.mockResolvedValue([])
    const html = renderToStaticMarkup(await CollectionsPage())
    expect(html).toContain('No Collections are published yet.')
  })

  it('returns 404 for an unknown or unpublished collection', async () => {
    mockCollections.one.mockResolvedValue({ status: 'not_found' })
    await expect(
      CollectionPage({
        params: Promise.resolve({ collectionKey: 'unknown', locale: 'en' }),
      }),
    ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
  })

  it('shows entitlement-backed completion and a direct Reader action', async () => {
    const twoStories = {
      ...collection,
      stories: [
        ...collection.stories,
        {
          hook: 'What if a map used light?',
          readingMinutes: 1,
          slug: 'lantern-atlas',
          storyKey: 'lantern-atlas',
          title: 'The Lantern Atlas',
        },
      ],
    }
    mockCollections.list.mockResolvedValue([twoStories])
    mockCollections.one.mockResolvedValue({
      status: 'available',
      collection: twoStories,
    })
    mockCollections.reader.mockResolvedValue({
      status: 'available',
      stories: [
        {
          locale: 'en',
          slug: 'clockwork-gardens',
          state: 'completed',
        },
      ],
    })

    const index = renderToStaticMarkup(await CollectionsPage())
    expect(index).toContain('1 of 2 completed')
    expect(index).toContain('1 owned')

    const detail = renderToStaticMarkup(
      await CollectionPage({
        params: Promise.resolve({
          collectionKey: 'synthetic-fixtures',
          locale: 'en',
        }),
      }),
    )
    expect(detail).toContain('Completed')
    expect(detail).toContain('/en/stories/clockwork-gardens/read')
    expect(detail).toContain('Read again')
    expect(detail).toContain('/en/stories/lantern-atlas')
    expect(detail).not.toContain('/en/stories/lantern-atlas/read')
  })

  it('does not invent zero progress when personalized data is unavailable', async () => {
    mockCollections.one.mockResolvedValue({ status: 'available', collection })
    mockCollections.reader.mockResolvedValue({ status: 'unavailable' })
    const html = renderToStaticMarkup(
      await CollectionPage({
        params: Promise.resolve({
          collectionKey: 'synthetic-fixtures',
          locale: 'en',
        }),
      }),
    )
    expect(html).toContain('Your reading progress is temporarily unavailable.')
    expect(html).toContain('/en/stories/clockwork-gardens')
    expect(html).not.toContain('0 of 1 completed')
  })
})
