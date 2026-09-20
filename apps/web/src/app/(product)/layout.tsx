import type { ReactNode } from 'react'

import { ApplicationShell } from './application-shell'

export default function ProductLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <ApplicationShell activeNavigation="discover">{children}</ApplicationShell>
  )
}
