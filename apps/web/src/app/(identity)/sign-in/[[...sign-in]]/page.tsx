import { SignIn } from '@clerk/nextjs'

import { safeReturnPath } from '@curiofold/domain'
import { ErrorState } from '@curiofold/ui'

import { isClerkSessionConfigured } from '@/server/identity'

import styles from '../../identity-shell.module.css'

interface SignInPageProps {
  readonly searchParams: Promise<{
    redirect_url?: string | string[]
  }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
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
          eyebrow="Sign-in unavailable"
          title="Account access is not configured here."
        />
      </div>
    )
  }

  return (
    <section aria-labelledby="sign-in-heading" className={styles.panel}>
      <div className={styles.introduction}>
        <h1 id="sign-in-heading">Continue your curiosity</h1>
        <p>Sign in to unlock Stories and return to your Library.</p>
      </div>
      <SignIn
        forceRedirectUrl={returnPath}
        path="/sign-in"
        routing="path"
        signUpForceRedirectUrl={returnPath}
        signUpUrl={`/sign-up?redirect_url=${encodeURIComponent(returnPath)}`}
      />
    </section>
  )
}
