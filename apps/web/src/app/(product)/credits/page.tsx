import Link from 'next/link'
import { redirect } from 'next/navigation'

import { safeReturnPath } from '@curiofold/domain'
import { ErrorState, PageFrame } from '@curiofold/ui'

import {
  IdentitySessionError,
  isClerkSessionConfigured,
  requireAuthorizationContext,
} from '@/server/identity'

import { CreditsPurchase } from './purchase'

export const dynamic = 'force-dynamic'

interface CreditsPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export default async function CreditsPage({ searchParams }: CreditsPageProps) {
  if (!isClerkSessionConfigured()) {
    return (
      <PageFrame>
        <ErrorState
          description="This environment has no identity provider connected."
          eyebrow="Credits unavailable"
          title="Credit purchases are not configured here."
        />
      </PageFrame>
    )
  }

  let emailVerified: boolean
  try {
    emailVerified = (await requireAuthorizationContext()).emailVerified
  } catch (error) {
    if (error instanceof IdentitySessionError) {
      if (error.code === 'unauthenticated') {
        redirect('/sign-in?redirect_url=%2Fcredits')
      }
      return (
        <PageFrame>
          <ErrorState
            description="Your account cannot start a credit purchase right now."
            eyebrow="Credits unavailable"
            title="Account access is unavailable."
          />
        </PageFrame>
      )
    }
    throw error
  }

  if (!emailVerified) {
    return (
      <PageFrame>
        <ErrorState
          description="Verify your email in your account before adding credits."
          eyebrow="Verification required"
          title="Your credits are waiting for you."
        />
        <Link href="/account">Go to Account</Link>
      </PageFrame>
    )
  }

  const query = await searchParams
  const orderValue = query.payment_order
  const orderId =
    typeof orderValue === 'string' && uuidPattern.test(orderValue)
      ? orderValue
      : null
  const returnValue = query.return
  const safePath = safeReturnPath(
    typeof returnValue === 'string' ? returnValue : null,
    '/account',
  )
  const returnPath = safePath.startsWith('/credits') ? '/account' : safePath

  return (
    <PageFrame>
      <CreditsPurchase orderId={orderId} returnPath={returnPath} />
    </PageFrame>
  )
}
