import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { curiofoldProductName } from '@curiofold/config'

import './styles.css'

export const metadata: Metadata = {
  description: 'Short, deeply researched factual Stories for curious readers.',
  title: {
    default: curiofoldProductName,
    template: `%s | ${curiofoldProductName}`,
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  initialScale: 1,
  width: 'device-width',
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
