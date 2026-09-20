import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
const secretKey = process.env.CLERK_SECRET_KEY
const applicationUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const identityProxy =
  publishableKey && secretKey
    ? clerkMiddleware({
        authorizedParties: [new URL(applicationUrl).origin],
        publishableKey,
        secretKey,
      })
    : () => NextResponse.next()

export default identityProxy

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
