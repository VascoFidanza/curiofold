import { createClerkWebhookResponse } from '@/server/clerk-webhook'
import { observeRoute } from '@/server/observability'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest): Promise<Response> {
  return observeRoute(request, '/api/webhooks/clerk', () =>
    createClerkWebhookResponse(request),
  )
}
