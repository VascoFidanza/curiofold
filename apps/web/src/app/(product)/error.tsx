'use client'

import { Button, ErrorState, PageFrame } from '@curiofold/ui'

export default function Error({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <PageFrame>
      <ErrorState
        action={<Button onClick={reset}>Retry</Button>}
        description="Your place is safe. Try loading this part of Curiofold again."
        title="We couldn’t load this page."
      />
    </PageFrame>
  )
}
