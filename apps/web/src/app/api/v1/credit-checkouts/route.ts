import { createCreditCheckoutResponse } from '@/server/credit-checkout-route'
import { observeRoute } from '@/server/observability'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  return observeRoute(request, '/api/v1/credit-checkouts', ({ requestId }) =>
    createCreditCheckoutResponse(request, requestId),
  )
}
