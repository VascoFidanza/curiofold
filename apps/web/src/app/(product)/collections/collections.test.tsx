import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CollectionsPage from './page'
import CollectionPage from '../[locale]/collections/[collectionKey]/page'

const mockCollections = vi.hoisted(() => ({
  list: vi.fn(),
  one: vi.fn(),
}))

vi.mock('@/server/public-collections', () => ({
  getPublicCollections: mockCollections.list,
  getPublicCollection: mockCollections.one,
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

beforeEach(() => vi.clearAllMocks())

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
})
