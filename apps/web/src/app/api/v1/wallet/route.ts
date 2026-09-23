import { observeRoute } from '@/server/observability'
import { createWalletResponse } from '@/server/wallet-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  return observeRoute(request, '/api/v1/wallet', ({ requestId }) =>
    createWalletResponse(request, requestId),
  )
}
