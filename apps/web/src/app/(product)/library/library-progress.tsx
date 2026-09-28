import type { LibraryStory } from '@curiofold/db'

import styles from './library.module.css'

export function LibraryProgress({
  stories,
}: Readonly<{ stories: readonly LibraryStory[] }>) {
  const completed = stories.filter(
    (story) => story.state === 'completed',
  ).length
  const inProgress = stories.filter(
    (story) => story.state === 'in_progress',
  ).length

  return (
    <section
      aria-labelledby="reading-progress-title"
      className={styles.summary}
      id="reading-progress"
      tabIndex={-1}
    >
      <div>
        <h2 id="reading-progress-title">Your reading progress</h2>
        <p>
          {completed} of {stories.length} Stories on this shelf completed.
        </p>
      </div>
      <dl className={styles.summaryCounts}>
        <div>
          <dt>Stories on this shelf</dt>
          <dd>{stories.length}</dd>
        </div>
        <div>
          <dt>Completed</dt>
          <dd>{completed}</dd>
        </div>
        <div>
          <dt>In progress</dt>
          <dd>{inProgress}</dd>
        </div>
      </dl>
    </section>
  )
}
