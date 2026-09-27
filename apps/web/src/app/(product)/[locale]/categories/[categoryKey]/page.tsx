import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ErrorState, PageFrame } from '@curiofold/ui'

import { categoryLabel } from '@curiofold/content'
import { getPublicCategoryStories } from '@/server/story-category'

import { CategoryListing } from './category-listing'

interface CategoryPageProps {
  readonly params: Promise<{ categoryKey: string; locale: string }>
}

const categoryPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const localePattern = /^[a-z]{2}(?:-[A-Z]{2})?$/u

function validPath(locale: string, categoryKey: string): boolean {
  return (
    localePattern.test(locale) &&
    categoryKey.length <= 80 &&
    categoryPattern.test(categoryKey)
  )
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { categoryKey, locale } = await params
  if (!validPath(locale, categoryKey)) return { robots: { index: false } }
  const category = await getPublicCategoryStories(locale, categoryKey)
  if (category.status !== 'available' || category.stories.length === 0) {
    return { robots: { index: false } }
  }
  const title = `${categoryLabel(categoryKey, locale)} Stories | Curiofold`
  return {
    title,
    description: `Explore reviewed Curiofold Stories about ${categoryLabel(categoryKey, locale)}.`,
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categoryKey, locale } = await params
  if (!validPath(locale, categoryKey)) notFound()

  const category = await getPublicCategoryStories(locale, categoryKey)
  if (category.status === 'unavailable') {
    return (
      <PageFrame>
        <ErrorState
          description="This category is temporarily unavailable. Please try again shortly."
          eyebrow="Browse unavailable"
          title="We could not load these Stories."
        />
      </PageFrame>
    )
  }
  if (category.stories.length === 0) notFound()

  return (
    <CategoryListing
      categoryKey={categoryKey}
      locale={locale}
      stories={category.stories}
    />
  )
}
