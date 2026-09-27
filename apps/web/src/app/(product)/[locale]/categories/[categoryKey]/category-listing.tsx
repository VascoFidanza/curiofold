import Link from 'next/link'

import { categoryLabel, type PublicStoryDetail } from '@curiofold/content'
import { PageFrame } from '@curiofold/ui'

import styles from './category.module.css'

export function CategoryListing({
  categoryKey,
  locale,
  stories,
}: Readonly<{
  categoryKey: string
  locale: string
  stories: readonly Pick<
    PublicStoryDetail,
    'hook' | 'readingMinutes' | 'slug' | 'storyKey' | 'title'
  >[]
}>) {
  const label = categoryLabel(categoryKey, locale)
  return (
    <PageFrame>
      <main className={styles.layout}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Explore a rabbit hole</p>
          <h1>{label}</h1>
          <p>Short, reviewed Stories to follow your curiosity.</p>
          <Link href="/">Explore all Stories</Link>
        </header>
        <section aria-labelledby="category-stories" className={styles.stories}>
          <h2 id="category-stories">Stories in {label}</h2>
          <div className={styles.grid}>
            {stories.map((story) => (
              <article className={styles.card} key={story.storyKey}>
                <p>{story.readingMinutes} min read</p>
                <h3>{story.title}</h3>
                <p>{story.hook}</p>
                <Link href={`/${locale}/stories/${story.slug}`}>
                  Read the preview <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </PageFrame>
  )
}
