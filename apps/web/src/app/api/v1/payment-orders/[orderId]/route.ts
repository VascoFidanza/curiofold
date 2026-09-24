import { observeRoute } from '@/server/observability'
import { createPaymentOrderStatusResponse } from '@/server/payment-order-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RouteContext {
  readonly params: Promise<{ orderId: string }>
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  return observeRoute(
    request,
    '/api/v1/payment-orders/[orderId]',
    async ({ requestId }) => {
      const { orderId } = await context.params
      return createPaymentOrderStatusResponse(orderId, requestId)
    },
  )
}
