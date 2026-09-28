import type { Metadata } from 'next'
import Link from 'next/link'

import { ErrorState, PageFrame } from '@curiofold/ui'

import { getPublicCollections } from '@/server/public-collections'
import { getCollectionReaderState } from '@/server/collection-reader-state'
import { summarizeCollectionReading } from './collection-progress'

import styles from './collections.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Collections | Curiofold',
  description: 'Follow a curated path through short, researched Stories.',
}

export default async function CollectionsPage() {
  const collections = await getPublicCollections('en')
  if (collections === null) {
    return (
      <PageFrame>
        <ErrorState
          description="Collections are temporarily unavailable. Please try again shortly."
          eyebrow="Browse unavailable"
          title="We could not load Collections."
        />
      </PageFrame>
    )
  }
  const reader = await getCollectionReaderState('en')

  return (
    <PageFrame>
      <section aria-labelledby="collections-title" className={styles.layout}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Follow a rabbit hole</p>
          <h1 id="collections-title">Collections</h1>
          <p>Curated paths through Stories that belong together.</p>
        </header>
        {collections.length === 0 ? (
          <p>
            No Collections are published yet.{' '}
            <Link href="/">Explore Stories</Link> instead.
          </p>
        ) : (
          <div className={styles.grid}>
            {collections.map((collection) => {
              const progress = summarizeCollectionReading(collection, reader)
              return (
                <article className={styles.card} key={collection.key}>
                  <p>
                    {collection.stories.length}{' '}
                    {collection.stories.length === 1 ? 'Story' : 'Stories'}
                  </p>
                  <h2>{collection.title}</h2>
                  <p>{collection.description}</p>
                  {progress && progress.ownedCount > 0 ? (
                    <p>
                      {progress.completedCount} of {collection.stories.length}{' '}
                      completed · {progress.ownedCount} owned
                    </p>
                  ) : null}
                  <Link
                    href={`/${collection.locale}/collections/${collection.key}`}
                  >
                    Explore Collection <span aria-hidden="true">→</span>
                  </Link>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </PageFrame>
  )
}
