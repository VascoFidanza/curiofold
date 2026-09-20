import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getPublicStoryRoute } from '@/server/public-story'

import { StoryDetail, MissingStoryLocale } from './story-detail'
import { createStoryMetadata } from './story-metadata'

interface StoryPageProps {
  readonly params: Promise<{
    locale: string
    slug: string
  }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: StoryPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  return createStoryMetadata(await getPublicStoryRoute(locale, slug), locale)
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { locale, slug } = await params
  const route = await getPublicStoryRoute(locale, slug)

  if (route.status === 'not_found') {
    notFound()
  }

  if (route.status === 'missing_locale') {
    return (
      <MissingStoryLocale
        availableLocalizations={route.availableLocalizations}
        requestedLocale={locale}
      />
    )
  }

  return <StoryDetail detail={route.detail} />
}
