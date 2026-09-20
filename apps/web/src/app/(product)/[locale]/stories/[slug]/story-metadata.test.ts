import { describe, expect, it } from 'vitest'

import type { PublicStoryRouteData } from '@/server/public-story'

import { createStoryMetadata } from './story-metadata'

const found: PublicStoryRouteData = {
  availableLocalizations: [
    { locale: 'en', slug: 'clockwork-gardens' },
    { locale: 'pt-PT', slug: 'jardins-de-relogio' },
  ],
  detail: {
    categoryKeys: ['design-history'],
    credibility: {
      reviewedAt: '2026-08-31T16:00:00+00:00',
      sourceCount: 1,
    },
    deck: 'A synthetic Story.',
    hook: 'What if a garden kept time?',
    locale: 'en',
    preview: 'A deliberately short public description.',
    previewBlocks: [],
    publishedAt: '2026-09-01T09:00:00+00:00',
    readingMinutes: 2,
    revision: 1,
    slug: 'clockwork-gardens',
    storyKey: 'clockwork-gardens',
    title: 'Clockwork Gardens',
    updateNote: null,
  },
  status: 'found',
}

describe('Story metadata', () => {
  it('publishes canonical, locale and share metadata for a public Story', () => {
    const metadata = createStoryMetadata(found, 'en')

    expect(metadata.title).toBe('Clockwork Gardens')
    expect(metadata.alternates).toEqual({
      canonical: '/en/stories/clockwork-gardens',
      languages: {
        en: '/en/stories/clockwork-gardens',
        'pt-PT': '/pt-PT/stories/jardins-de-relogio',
      },
    })
    expect(metadata.openGraph).toMatchObject({
      locale: 'en',
      title: 'Clockwork Gardens',
      type: 'article',
    })
    expect(metadata.twitter).toMatchObject({
      card: 'summary',
      title: 'Clockwork Gardens',
    })
  })

  it('prevents indexing when the requested locale is unavailable', () => {
    const metadata = createStoryMetadata(
      {
        availableLocalizations: [{ locale: 'en', slug: 'clockwork-gardens' }],
        status: 'missing_locale',
      },
      'pt-PT',
    )

    expect(metadata.robots).toEqual({ follow: true, index: false })
    expect(metadata.alternates).toEqual({
      languages: { en: '/en/stories/clockwork-gardens' },
    })
  })

  it('prevents indexing an unknown Story route', () => {
    const metadata = createStoryMetadata({ status: 'not_found' }, 'en')

    expect(metadata.robots).toEqual({ follow: false, index: false })
  })
})
