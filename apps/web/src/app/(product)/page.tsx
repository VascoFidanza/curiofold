import { PageFrame } from '@curiofold/ui'

import styles from './page.module.css'

export default function HomePage() {
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
        <div className={styles.foundationNote}>
          <span aria-hidden="true" className={styles.noteMarker} />
          <p>
            Curiofold&apos;s first reviewed Stories are being prepared for this
            reading experience.
          </p>
        </div>
      </section>
    </PageFrame>
  )
}
