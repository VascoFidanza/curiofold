import Link from 'next/link'
import { redirect } from 'next/navigation'

import { ErrorState, PageFrame } from '@curiofold/ui'

import {
  IdentitySessionError,
  isClerkSessionConfigured,
  requireAuthorizationContext,
} from '@/server/identity'

import { CreditsPurchase } from './purchase'
import { resolveCreditsReturnContext } from './return-context'

export const dynamic = 'force-dynamic'

interface CreditsPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CreditsPage({ searchParams }: CreditsPageProps) {
  const { orderId, returnPath, signInPath } = resolveCreditsReturnContext(
    await searchParams,
  )
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
        redirect(signInPath)
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

  return (
    <PageFrame>
      <CreditsPurchase orderId={orderId} returnPath={returnPath} />
    </PageFrame>
  )
}
