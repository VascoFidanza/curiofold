import Link from 'next/link'

import type { LibraryStory } from '@curiofold/db'

import styles from './library.module.css'

const filters = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
] as const

export type LibraryFilter = (typeof filters)[number]['key']

export function parseLibraryFilter(
  value: string | string[] | undefined,
): LibraryFilter {
  return filters.find(({ key }) => key === value)?.key ?? 'all'
}

export function filterLibraryStories(
  stories: readonly LibraryStory[],
  filter: LibraryFilter,
): readonly LibraryStory[] {
  return filter === 'all'
    ? stories
    : stories.filter(({ state }) => state === filter)
}

export function LibraryFilters({
  activeFilter,
  stories,
}: Readonly<{
  activeFilter: LibraryFilter
  stories: readonly LibraryStory[]
}>) {
  return (
    <nav aria-label="Filter your Library" className={styles.filters}>
      {filters.map(({ key, label }) => (
        <Link
          aria-current={key === activeFilter ? 'page' : undefined}
          href={key === 'all' ? '/library' : `/library?state=${key}`}
          key={key}
          prefetch={false}
        >
          {label} ({filterLibraryStories(stories, key).length})
        </Link>
      ))}
    </nav>
  )
}
