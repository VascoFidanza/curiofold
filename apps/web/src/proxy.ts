import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'

import { nonceResponse } from './server/nonce-csp'

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
const secretKey = process.env.CLERK_SECRET_KEY
const applicationUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const identityProxy =
  publishableKey && secretKey
    ? clerkMiddleware(
        () => {
          const response = NextResponse.next()
          response.headers.set('Cache-Control', 'private, no-store')
          return response
        },
        {
          authorizedParties: [new URL(applicationUrl).origin],
          publishableKey,
          secretKey,
          contentSecurityPolicy: {
            strict: true,
            directives: {
              'base-uri': ["'self'"],
              'frame-ancestors': ["'none'"],
              // Clerk's sign-in UI uses embedded image assets, never scripts.
              'img-src': ['data:'],
              'object-src': ["'none'"],
              'script-src-attr': ["'none'"],
            },
          },
        },
      )
    : (request: NextRequest) => nonceResponse(request)

export default identityProxy

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
