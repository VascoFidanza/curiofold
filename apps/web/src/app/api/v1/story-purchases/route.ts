import { observeRoute } from '@/server/observability'
import { createStoryPurchaseResponse } from '@/server/story-purchase-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  return observeRoute(request, '/api/v1/story-purchases', ({ requestId }) =>
    createStoryPurchaseResponse(request, requestId),
  )
}
