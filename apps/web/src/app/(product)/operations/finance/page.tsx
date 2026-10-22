import Link from 'next/link'
import { can } from '@curiofold/domain'
import { FinanceAuthorizationError, listRefundReviews } from '@curiofold/db'
import { ErrorState, PageFrame } from '@curiofold/ui'

import { getDatabase } from '@/server/database'
import {
  IdentitySessionError,
  requireAuthorizationContext,
} from '@/server/identity'
import { runtimeLogger } from '@/server/observability'

import styles from '../../account/account.module.css'
import { RefundReviewPanel } from './refund-review'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const metadata = {
  title: 'Finance operations — Curiofold',
  robots: { index: false, follow: false },
}

async function resolveFinance() {
  try {
    const authorization = await requireAuthorizationContext()
    if (!can(authorization, 'payment.refund'))
      throw new FinanceAuthorizationError()
    const reviews = await listRefundReviews(getDatabase().client, authorization)
    return { status: 'ready' as const, reviews }
  } catch (error) {
    const denied =
      error instanceof FinanceAuthorizationError ||
      (error instanceof IdentitySessionError &&
        error.code !== 'identity_unavailable')
    if (!denied)
      runtimeLogger.error('finance.page_unavailable', {
        errorKind: 'dependency_unavailable',
      })
    return { status: denied ? ('denied' as const) : ('unavailable' as const) }
  }
}

export default async function FinancePage() {
  const result = await resolveFinance()
  if (result.status !== 'ready') {
    const denied = result.status === 'denied'
    return (
      <PageFrame>
        <ErrorState
          eyebrow={denied ? 'Restricted operations' : 'Temporarily unavailable'}
          title={
            denied
              ? 'Finance access and recent MFA required.'
              : 'Finance review is unavailable.'
          }
          description={
            denied
              ? 'Use an authorized finance/admin account and verify both sign-in factors within 15 minutes. Account security can be managed from Account.'
              : 'Please try again shortly. No financial action was performed.'
          }
        />
        <Link href="/account">Go to Account</Link>
      </PageFrame>
    )
  }
  return (
    <PageFrame>
      <div className={styles.account}>
        <p className={styles.eyebrow}>Internal operations</p>
        <h1>Finance review</h1>
        <p>
          Restricted to active finance/admin staff with recent multi-factor
          verification. Amounts and credits come from the original payment
          order.
        </p>
        <RefundReviewPanel reviews={result.reviews} />
        <Link href="/account">Back to Account</Link>
      </div>
    </PageFrame>
  )
}
