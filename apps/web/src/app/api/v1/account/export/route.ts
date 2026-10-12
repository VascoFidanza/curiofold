import { createAccountExportResponse } from '@/server/account-export-route'
import { observeRoute } from '@/server/observability'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  return observeRoute(request, '/api/v1/account/export', ({ requestId }) =>
    createAccountExportResponse(request, requestId),
  )
}
