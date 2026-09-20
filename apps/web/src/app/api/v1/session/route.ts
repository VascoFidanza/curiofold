import { observeRoute } from '@/server/observability'
import { createSessionResponse } from '@/server/session-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  return observeRoute(request, '/api/v1/session', () => createSessionResponse())
}
