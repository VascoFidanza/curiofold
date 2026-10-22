import { notFound } from 'next/navigation'
import { PageFrame } from '@curiofold/ui'

import { RefundReviewPanel } from '../../(product)/operations/finance/refund-review'
import { ApplicationShell } from '../../(product)/application-shell'
import { assertE2eFixturesEnabled } from '../../../testing/e2e-story'

export default function FinanceReviewFixturePage() {
  try {
    assertE2eFixturesEnabled()
  } catch {
    notFound()
  }
  return (
    <ApplicationShell>
      <PageFrame>
        <h1>Finance review fixture</h1>
        <RefundReviewPanel
          reviews={[
            {
              id: '33333333-3333-4333-8333-333333333333',
              orderId: '11111111-1111-4111-8111-111111111111',
              amountMinor: 130,
              currency: 'EUR',
              creditsRequested: 0,
              status: 'manual_review',
              reasonCode: 'customer_request',
              createdAt: '2026-10-22T12:00:00Z',
            },
          ]}
        />
      </PageFrame>
    </ApplicationShell>
  )
}
