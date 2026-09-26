import { PageFrame } from '@curiofold/ui'

import { getPublicStoryCards } from '@/server/public-story'

import styles from './page.module.css'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const stories = await getPublicStoryCards('en')

  return (
    <PageFrame>
      <section aria-labelledby="discover-title" className={styles.hero}>
        <p className={styles.eyebrow}>Small stories. Big rabbit holes.</p>
        <h1 className={styles.title} id="discover-title">
          What are you curious about today?
        </h1>
        <p className={styles.lede}>
          Short, deeply researched stories about the things worth knowing.
        </p>
        {stories.length > 0 ? (
          <section
            aria-labelledby="featured-stories"
            className={styles.catalog}
          >
            <div className={styles.catalogHeading}>
              <p className={styles.eyebrow}>Start exploring</p>
              <h2 id="featured-stories">Stories worth following</h2>
            </div>
            <div className={styles.storyGrid}>
              {stories.map((story) => (
                <article className={styles.storyCard} key={story.storyKey}>
                  <p className={styles.cardCategory}>
                    {story.categoryKeys[0] ?? 'Curiosity'}
                  </p>
                  <h3>{story.title}</h3>
                  <p>{story.hook}</p>
                  <Link href={`/en/stories/${story.slug}`}>
                    Read the preview <span aria-hidden="true">→</span>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <div className={styles.foundationNote}>
            <span aria-hidden="true" className={styles.noteMarker} />
            <p>
              Curiofold&apos;s first reviewed Stories are being prepared for
              this reading experience.
            </p>
          </div>
        )}
      </section>
    </PageFrame>
  )
}
