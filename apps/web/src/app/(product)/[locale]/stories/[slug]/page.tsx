import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getPublicStoryRoute } from '@/server/public-story'
import { resolveStoryPurchaseState } from '@/server/story-purchase-state'

import { StoryDetail, MissingStoryLocale } from './story-detail'
import { createStoryMetadata } from './story-metadata'

interface StoryPageProps {
  readonly params: Promise<{
    locale: string
    slug: string
  }>
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: StoryPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  return createStoryMetadata(await getPublicStoryRoute(locale, slug), locale)
}

export default async function StoryPage({
  params,
  searchParams,
}: StoryPageProps) {
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

  const purchase = await resolveStoryPurchaseState(route.storyId, locale)
  const query = await searchParams
  const orderParam = query.payment_order
  const orderId =
    typeof orderParam === 'string' && uuidPattern.test(orderParam)
      ? orderParam
      : null
  return (
    <StoryDetail
      detail={route.detail}
      checkoutCanceled={query.payment === 'canceled'}
      orderId={orderId}
      purchase={purchase}
      storyId={route.storyId}
    />
  )
}
