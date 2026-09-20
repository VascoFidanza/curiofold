import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Instrument_Sans, Newsreader } from 'next/font/google'
import type { ReactNode } from 'react'

import { curiofoldProductName, parsePublicEnvironment } from '@curiofold/config'

import '@curiofold/ui/tokens.css'
import './styles.css'

import { isClerkSessionConfigured } from '@/server/identity'

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
  const clerkPublishableKey =
    publicEnvironment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  return (
    <html
      className={`${instrumentSans.variable} ${newsreader.variable}`}
      lang="en"
    >
      <body>
        {clerkPublishableKey && isClerkSessionConfigured() ? (
          <ClerkProvider
            publishableKey={clerkPublishableKey}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
          >
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  )
}
