import { observeRoute } from '@/server/observability'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function GET(request: Request): Promise<Response> {
  return observeRoute(request, '/health/live', () =>
    Promise.resolve(
      Response.json(
        { status: 'ok' },
        { headers: { 'Cache-Control': 'no-store' } },
      ),
    ),
  )
}
