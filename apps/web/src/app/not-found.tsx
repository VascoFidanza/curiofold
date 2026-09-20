import Link from 'next/link'

import { ErrorState, PageFrame } from '@curiofold/ui'

import styles from './not-found.module.css'

export default function NotFound() {
  return (
    <PageFrame>
      <ErrorState
        action={
          <Link className={styles.action} href="/">
            Return to Discover
          </Link>
        }
        description="The page may have moved, but there are more Stories to discover."
        eyebrow="Not found"
        title="This rabbit hole ends here."
      />
    </PageFrame>
  )
}
