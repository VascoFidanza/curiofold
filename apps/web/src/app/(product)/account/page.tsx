import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

import { ErrorState, PageFrame } from '@curiofold/ui'

import {
  IdentitySessionError,
  isClerkSessionConfigured,
  requireAuthorizationContext,
} from '@/server/identity'

import styles from './account.module.css'

export const dynamic = 'force-dynamic'

type AccountResolution =
  | Readonly<{
      emailVerified: boolean
      status: 'authenticated'
    }>
  | Readonly<{
      status: 'account_disabled' | 'unauthenticated'
    }>

async function resolveAccount(): Promise<AccountResolution> {
  try {
    const context = await requireAuthorizationContext()
    return {
      emailVerified: context.emailVerified,
      status: 'authenticated',
    }
  } catch (error) {
    if (error instanceof IdentitySessionError) {
      if (
        error.code === 'unauthenticated' ||
        error.code === 'account_disabled'
      ) {
        return { status: error.code }
      }
    }

    throw error
  }
}

export default async function AccountPage() {
  if (!isClerkSessionConfigured()) {
    return (
      <PageFrame>
        <ErrorState
          description="This environment has no identity provider connected. No account or session data is available."
          eyebrow="Account unavailable"
          title="Account access is not configured here."
        />
      </PageFrame>
    )
  }

  const account = await resolveAccount()
  if (account.status === 'authenticated') {
    return (
      <PageFrame>
        <section className={styles.account}>
          <p className={styles.eyebrow}>Account</p>
          <h1>Your Curiofold account</h1>
          <p>
            Your identity session is active. Curiofold keeps authorization and
            ownership decisions in its own audited data model.
          </p>
          <div className={styles.sessionCard}>
            <p>
              {account.emailVerified
                ? 'Email verified'
                : 'Email verification required for unlocks'}
            </p>
            <UserButton />
          </div>
        </section>
      </PageFrame>
    )
  }

  if (account.status === 'unauthenticated') {
    return (
      <PageFrame>
        <section className={styles.account}>
          <p className={styles.eyebrow}>Account</p>
          <h1>Sign in to continue</h1>
          <p>Your Library and reading progress will appear here.</p>
          <Link
            className={styles.signInLink}
            href="/sign-in?redirect_url=%2Faccount"
          >
            Sign in
          </Link>
        </section>
      </PageFrame>
    )
  }

  return (
    <PageFrame>
      <ErrorState
        description="This account cannot access protected Curiofold data. Contact support if you believe this is a mistake."
        eyebrow="Access denied"
        title="Account access is disabled."
      />
    </PageFrame>
  )
}
