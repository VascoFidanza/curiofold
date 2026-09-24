import { runPaymentReconciliationBatch } from '@/server/payment-reconciliation-worker'

function authorized(request: Request): boolean {
  const configured = process.env.CRON_SECRET?.trim()
  if (!configured) return false
  return request.headers.get('authorization') === `Bearer ${configured}`
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return Response.json(
      { type: 'about:blank', title: 'Unauthorized', status: 401 },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
          'WWW-Authenticate': 'Bearer',
        },
      },
    )
  }

  try {
    const result = await runPaymentReconciliationBatch()
    return Response.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json(
      { type: 'about:blank', title: 'Reconciliation unavailable', status: 503 },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
      },
    )
  }
}
