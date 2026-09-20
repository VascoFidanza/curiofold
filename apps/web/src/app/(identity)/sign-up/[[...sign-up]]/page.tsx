import { SignUp } from '@clerk/nextjs'

import { safeReturnPath } from '@curiofold/domain'
import { ErrorState } from '@curiofold/ui'

import { isClerkSessionConfigured } from '@/server/identity'

import styles from '../../identity-shell.module.css'

interface SignUpPageProps {
  readonly searchParams: Promise<{
    redirect_url?: string | string[]
  }>
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { redirect_url: redirectUrl } = await searchParams
  const requestedReturnPath = Array.isArray(redirectUrl)
    ? redirectUrl[0]
    : redirectUrl
  const returnPath = safeReturnPath(requestedReturnPath)

  if (!isClerkSessionConfigured()) {
    return (
      <div className={styles.panel}>
        <ErrorState
          description="This environment has no identity provider connected. Public Stories remain available."
          eyebrow="Account creation unavailable"
          title="Account access is not configured here."
        />
      </div>
    )
  }

  return (
    <section aria-labelledby="sign-up-heading" className={styles.panel}>
      <div className={styles.introduction}>
        <h1 id="sign-up-heading">Create your Curiofold account</h1>
        <p>Your Library and reading progress will stay with you.</p>
      </div>
      <SignUp
        forceRedirectUrl={returnPath}
        path="/sign-up"
        routing="path"
        signInForceRedirectUrl={returnPath}
        signInUrl={`/sign-in?redirect_url=${encodeURIComponent(returnPath)}`}
      />
    </section>
  )
}
