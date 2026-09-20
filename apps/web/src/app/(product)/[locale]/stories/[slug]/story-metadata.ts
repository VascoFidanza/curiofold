import type { Metadata } from 'next'

import type { PublicStoryRouteData } from '@/server/public-story'

function storyPath(locale: string, slug: string): string {
  return `/${locale}/stories/${slug}`
}

function descriptionForMetadata(description: string): string {
  if (description.length <= 160) {
    return description
  }

  return `${description.slice(0, 157).trimEnd()}…`
}

export function createStoryMetadata(
  route: PublicStoryRouteData,
  requestedLocale: string,
): Metadata {
  if (route.status === 'not_found') {
    return {
      robots: { follow: false, index: false },
      title: 'Story not found',
    }
  }

  if (route.status === 'missing_locale') {
    return {
      alternates: {
        languages: Object.fromEntries(
          route.availableLocalizations.map(({ locale, slug }) => [
            locale,
            storyPath(locale, slug),
          ]),
        ),
      },
      description:
        'This Curiofold Story is not yet available in the requested language.',
      robots: { follow: true, index: false },
      title: `Story unavailable in ${requestedLocale}`,
    }
  }

  const { detail } = route
  const description = descriptionForMetadata(detail.preview)
  const languages = Object.fromEntries(
    route.availableLocalizations.map(({ locale, slug }) => [
      locale,
      storyPath(locale, slug),
    ]),
  )

  return {
    alternates: {
      canonical: storyPath(detail.locale, detail.slug),
      languages,
    },
    description,
    openGraph: {
      description,
      locale: detail.locale.replace('-', '_'),
      publishedTime: detail.publishedAt,
      title: detail.title,
      type: 'article',
    },
    title: detail.title,
    twitter: {
      card: 'summary',
      description,
      title: detail.title,
    },
  }
}

export { storyPath }
