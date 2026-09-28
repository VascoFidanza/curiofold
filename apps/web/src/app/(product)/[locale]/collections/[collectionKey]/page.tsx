import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ErrorState, PageFrame } from '@curiofold/ui'

import { getPublicCollection } from '@/server/public-collections'
import { getCollectionReaderState } from '@/server/collection-reader-state'
import { summarizeCollectionReading } from '../../../collections/collection-progress'

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
  const reader = await getCollectionReaderState(locale)
  const progress = summarizeCollectionReading(collection, reader)
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
          {progress && progress.ownedCount > 0 ? (
            <p>
              {progress.completedCount} of {collection.stories.length} completed
              · {progress.ownedCount} owned
            </p>
          ) : null}
          {reader.status === 'unavailable' ? (
            <p>Your reading progress is temporarily unavailable.</p>
          ) : null}
          <Link href="/collections">All Collections</Link>
        </header>
        <div className={styles.grid}>
          {collection.stories.map((story) => {
            const state = progress?.stateBySlug.get(story.slug)
            return (
              <article className={styles.card} key={story.storyKey}>
                <p>{story.readingMinutes} min read</p>
                {state ? (
                  <p>
                    {state === 'completed'
                      ? 'Completed'
                      : state === 'in_progress'
                        ? 'In progress'
                        : 'Owned'}
                  </p>
                ) : null}
                <h2>{story.title}</h2>
                <p>{story.hook}</p>
                <Link
                  href={
                    state
                      ? `/${locale}/stories/${story.slug}/read`
                      : `/${locale}/stories/${story.slug}`
                  }
                >
                  {state === 'completed'
                    ? 'Read again'
                    : state === 'in_progress'
                      ? 'Continue reading'
                      : state === 'unread'
                        ? 'Start reading'
                        : 'Read the preview'}{' '}
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            )
          })}
        </div>
      </section>
    </PageFrame>
  )
}
