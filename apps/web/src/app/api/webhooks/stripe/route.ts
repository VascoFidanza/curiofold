import { observeRoute } from '@/server/observability'
import { createStripeWebhookResponse } from '@/server/stripe-webhook'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  return observeRoute(request, '/api/webhooks/stripe', () =>
    createStripeWebhookResponse(request),
  )
}
