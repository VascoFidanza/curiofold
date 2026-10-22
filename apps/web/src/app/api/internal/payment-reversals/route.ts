import { observeRoute } from '@/server/observability'
import { createRefundReviewResponse } from '@/server/refund-review-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handle(request: Request): Promise<Response> {
  return observeRoute(
    request,
    '/api/internal/payment-reversals',
    ({ requestId }) => createRefundReviewResponse(request, requestId),
  )
}

export { handle as GET, handle as POST }
