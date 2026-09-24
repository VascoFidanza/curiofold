import { can, type AuthorizationContext } from '@curiofold/domain'
import { findPaymentOrderForUser, type PaymentOrderRecord } from '@curiofold/db'

import { getDatabase } from './database'
import { IdentitySessionError, requireAuthorizationContext } from './identity'

type AuthorizationSource = () => Promise<AuthorizationContext>
type OrderSource = (
  orderId: string,
  userId: string,
) => Promise<PaymentOrderRecord | null>

interface PaymentOrderRouteDependencies {
  readonly authorizationSource?: AuthorizationSource
  readonly orderSource?: OrderSource
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

function problem(
  status: number,
  code: string,
  title: string,
  requestId: string,
  headers: HeadersInit = {},
): Response {
  const responseHeaders = new Headers(headers)
  responseHeaders.set('Cache-Control', 'no-store')
  responseHeaders.set('Content-Type', 'application/problem+json')
  return Response.json(
    { type: 'about:blank', title, status, code, requestId },
    { status, headers: responseHeaders },
  )
}

function customerStatus(
  status: PaymentOrderRecord['status'],
): 'canceled' | 'fulfilled' | 'processing' {
  if (status === 'fulfilled') return 'fulfilled'
  if (status === 'canceled') return 'canceled'
  return 'processing'
}

export async function createPaymentOrderStatusResponse(
  orderId: string,
  requestId: string,
  dependencies: PaymentOrderRouteDependencies = {},
): Promise<Response> {
  if (!uuidPattern.test(orderId)) {
    return problem(404, 'not_found', 'Payment order not found', requestId)
  }

  let authorization: AuthorizationContext
  try {
    authorization = await (
      dependencies.authorizationSource ?? requireAuthorizationContext
    )()
  } catch (error) {
    if (!(error instanceof IdentitySessionError)) throw error
    if (error.code === 'identity_unavailable') {
      return problem(
        503,
        'identity_unavailable',
        'Identity service unavailable',
        requestId,
        { 'Retry-After': '60' },
      )
    }
    if (error.code === 'unauthenticated') {
      return problem(
        401,
        'unauthenticated',
        'Authentication required',
        requestId,
        { 'WWW-Authenticate': 'Clerk' },
      )
    }
    return problem(
      403,
      'account_disabled',
      'Account access disabled',
      requestId,
    )
  }

  if (!can(authorization, 'account.read')) {
    return problem(
      403,
      'account_disabled',
      'Account access disabled',
      requestId,
    )
  }

  const order = await (
    dependencies.orderSource ??
    ((id, userId) => findPaymentOrderForUser(getDatabase().client, id, userId))
  )(orderId, authorization.userId)
  if (!order) {
    return problem(404, 'not_found', 'Payment order not found', requestId)
  }

  return Response.json(
    {
      amountMinor: order.amountMinor,
      credits: order.credits,
      currency: order.currency,
      orderId: order.id,
      status: customerStatus(order.status),
      updatedAt: order.updatedAt,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
