import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ErrorState, PageFrame } from '@curiofold/ui'

import { getPublicCollection } from '@/server/public-collections'

import styles from '../../../collections/collections.module.css'

interface CollectionPageProps {
  readonly params: Promise<{ collectionKey: string; locale: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { collectionKey, locale } = await params
  const result = await getPublicCollection(locale, collectionKey)
  return result.status === 'available'
    ? {
        title: `${result.collection.title} | Curiofold`,
        description: result.collection.description,
      }
    : { robots: { index: false } }
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { collectionKey, locale } = await params
  const result = await getPublicCollection(locale, collectionKey)
  if (result.status === 'not_found') notFound()
  if (result.status !== 'available') {
    return (
      <PageFrame>
        <ErrorState
          description="This Collection is temporarily unavailable. Please try again shortly."
          eyebrow="Browse unavailable"
          title="We could not load these Stories."
        />
      </PageFrame>
    )
  }

  const { collection } = result
  return (
    <PageFrame>
      <section aria-labelledby="collection-title" className={styles.layout}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Explore a rabbit hole</p>
          <h1 id="collection-title">{collection.title}</h1>
          <p>{collection.description}</p>
          <p>
            {collection.stories.length}{' '}
            {collection.stories.length === 1 ? 'Story' : 'Stories'}
          </p>
          <Link href="/collections">All Collections</Link>
        </header>
        <div className={styles.grid}>
          {collection.stories.map((story) => (
            <article className={styles.card} key={story.storyKey}>
              <p>{story.readingMinutes} min read</p>
              <h2>{story.title}</h2>
              <p>{story.hook}</p>
              <Link href={`/${locale}/stories/${story.slug}`}>
                Read the preview <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </PageFrame>
  )
}
