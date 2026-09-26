import Link from 'next/link'

import { PageFrame } from '@curiofold/ui'

import { getPublicStorySearch } from '@/server/story-search'

import styles from './search.module.css'

interface SearchPageProps {
  readonly searchParams: Promise<{ q?: string }>
}

export const dynamic = 'force-dynamic'

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''
  const results =
    query.length >= 2 ? await getPublicStorySearch('en', query) : []

  return (
    <PageFrame>
      <main className={styles.layout}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Find your next rabbit hole</p>
          <h1>Search Stories</h1>
          <p>
            Search the reviewed Curiofold catalogue by title, theme, or idea.
          </p>
        </header>

        <form className={styles.form} method="get">
          <label htmlFor="story-search">Search the catalogue</label>
          <div className={styles.searchRow}>
            <input
              autoComplete="off"
              defaultValue={query}
              id="story-search"
              maxLength={100}
              minLength={2}
              name="q"
              placeholder="Try “clockwork”"
              type="search"
            />
            <button type="submit">Search</button>
          </div>
        </form>

        {query.length > 0 && query.length < 2 ? (
          <p className={styles.message} role="status">
            Enter at least 2 characters to search.
          </p>
        ) : query.length >= 2 && results.length === 0 ? (
          <p className={styles.message} role="status">
            No reviewed Stories matched “{query}”. Try a broader idea.
          </p>
        ) : results.length > 0 ? (
          <section aria-labelledby="search-results" className={styles.results}>
            <h2 id="search-results">Search results</h2>
            <div className={styles.resultGrid}>
              {results.map((story) => (
                <article
                  className={styles.resultCard}
                  key={`${story.locale}:${story.slug}`}
                >
                  <p className={styles.readingTime}>
                    {story.readingMinutes} min read
                  </p>
                  <h3>{story.title}</h3>
                  <p>{story.hook || story.deck}</p>
                  <Link href={`/${story.locale}/stories/${story.slug}`}>
                    Read the preview <span aria-hidden="true">→</span>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <p className={styles.message} role="status">
            Search the catalogue to find something fascinating.
          </p>
        )}
      </main>
    </PageFrame>
  )
}
