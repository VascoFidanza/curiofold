import type { Metadata, Viewport } from 'next'
import { Instrument_Sans, Newsreader } from 'next/font/google'
import type { ReactNode } from 'react'

import { curiofoldProductName, parsePublicEnvironment } from '@curiofold/config'

import '@curiofold/ui/tokens.css'
import './styles.css'

const publicEnvironment = parsePublicEnvironment(process.env)

const instrumentSans = Instrument_Sans({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-instrument-sans',
})

const newsreader = Newsreader({
  display: 'swap',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-newsreader',
})

export const metadata: Metadata = {
  description: 'Short, deeply researched factual Stories for curious readers.',
  metadataBase: new URL(publicEnvironment.NEXT_PUBLIC_APP_URL),
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
    <html
      className={`${instrumentSans.variable} ${newsreader.variable}`}
      lang="en"
    >
      <body>{children}</body>
    </html>
  )
}
