import Link from 'next/link'

import { PageFrame } from '@curiofold/ui'

export default function NotFound() {
  return (
    <PageFrame>
      <main>
        <p className="eyebrow">Not found</p>
        <h1>This rabbit hole ends here.</h1>
        <p className="lede">
          <Link href="/">Return to Curiofold</Link>
        </p>
      </main>
    </PageFrame>
  )
}
