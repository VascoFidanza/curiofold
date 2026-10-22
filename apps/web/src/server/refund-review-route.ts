import { can, type AuthorizationContext } from '@curiofold/domain'
import {
  FinanceAuthorizationError,
  listRefundReviews,
  PaymentReversalConflictError,
  PaymentReversalUnavailableError,
  refundReviewSummary,
  requestRefundReview,
  type CreatePaymentReversalResult,
  type RefundReview,
  type RefundReviewInput,
} from '@curiofold/db'

import { getDatabase } from './database'
import { IdentitySessionError, requireAuthorizationContext } from './identity'
import { runtimeLogger } from './observability'

interface Dependencies {
  readonly authorizationSource?: () => Promise<AuthorizationContext>
  readonly list?: (
    authorization: AuthorizationContext,
  ) => Promise<readonly RefundReview[]>
  readonly requestReview?: (
    input: RefundReviewInput,
  ) => Promise<CreatePaymentReversalResult>
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const reasons = new Set([
  'customer_request',
  'duplicate_purchase',
  'payment_issue',
])
const headers = { 'Cache-Control': 'private, no-store' }

function problem(
  status: number,
  code: string,
  title: string,
  requestId: string,
) {
  return Response.json(
    { type: 'about:blank', status, code, title, requestId },
    {
      status,
      headers: {
        ...headers,
        'Content-Type': 'application/problem+json',
        ...(status === 503 ? { 'Retry-After': '60' } : {}),
      },
    },
  )
}

async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader()
  if (!reader) throw new TypeError('Body required')
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    for (;;) {
      const result = await reader.read()
      if (result.done) break
      bytes += result.value.byteLength
      if (bytes > 2048) {
        await reader.cancel()
        throw new TypeError('Body too large')
      }
      chunks.push(result.value)
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } finally {
    reader.releaseLock()
  }
}

export async function createRefundReviewResponse(
  request: Request,
  requestId: string,
  dependencies: Dependencies = {},
): Promise<Response> {
  try {
    const authorization = await (
      dependencies.authorizationSource ?? requireAuthorizationContext
    )()
    if (!can(authorization, 'payment.refund'))
      throw new FinanceAuthorizationError()
    if (new URL(request.url).search)
      return problem(
        400,
        'invalid_request',
        'Query parameters are not supported',
        requestId,
      )
    if (request.method === 'GET') {
      const reviews = await (
        dependencies.list ??
        ((context) => listRefundReviews(getDatabase().client, context))
      )(authorization)
      return Response.json({ reviews, policyRequired: true }, { headers })
    }
    if (request.method !== 'POST')
      return problem(405, 'method_not_allowed', 'Method not allowed', requestId)
    if (
      request.headers.get('origin') !== new URL(request.url).origin ||
      (request.headers.has('sec-fetch-site') &&
        request.headers.get('sec-fetch-site') !== 'same-origin')
    ) {
      return problem(
        403,
        'invalid_origin',
        'Same-origin request required',
        requestId,
      )
    }
    const operationKey = request.headers.get('idempotency-key')
    if (!operationKey || !/^[A-Za-z0-9._:-]{8,128}$/u.test(operationKey)) {
      return problem(
        400,
        'invalid_idempotency_key',
        'A valid Idempotency-Key is required',
        requestId,
      )
    }
    if (
      request.headers.get('content-type')?.split(';')[0]?.trim() !==
      'application/json'
    ) {
      return problem(415, 'invalid_content_type', 'JSON required', requestId)
    }
    let body: unknown
    try {
      body = await readBody(request)
    } catch {
      return problem(
        400,
        'invalid_request',
        'A small JSON request is required',
        requestId,
      )
    }
    if (
      typeof body !== 'object' ||
      body === null ||
      Array.isArray(body) ||
      Object.keys(body).some(
        (key) => key !== 'orderId' && key !== 'reasonCode',
      ) ||
      !('orderId' in body) ||
      typeof body.orderId !== 'string' ||
      !uuidPattern.test(body.orderId) ||
      !('reasonCode' in body) ||
      typeof body.reasonCode !== 'string' ||
      !reasons.has(body.reasonCode)
    ) {
      return problem(
        400,
        'invalid_request',
        'A valid order ID and reason code are required',
        requestId,
      )
    }
    const result = await (
      dependencies.requestReview ??
      ((input) => requestRefundReview(getDatabase().client, input))
    )({
      authorization,
      operationKey,
      orderId: body.orderId,
      reasonCode: body.reasonCode,
      correlationId: requestId,
    })
    return Response.json(
      { review: refundReviewSummary(result.reversal), policyRequired: true },
      {
        status: result.created ? 201 : 200,
        headers,
      },
    )
  } catch (error) {
    if (
      error instanceof FinanceAuthorizationError ||
      (error instanceof IdentitySessionError &&
        error.code === 'account_disabled')
    ) {
      return problem(
        403,
        'finance_assurance_required',
        'Active finance/admin access and recent MFA are required',
        requestId,
      )
    }
    if (
      error instanceof IdentitySessionError &&
      error.code === 'unauthenticated'
    )
      return problem(401, 'unauthenticated', 'Sign in required', requestId)
    if (error instanceof PaymentReversalConflictError)
      return problem(
        409,
        'idempotency_conflict',
        'This request key was already used for different details',
        requestId,
      )
    if (error instanceof PaymentReversalUnavailableError)
      return problem(
        409,
        error.code,
        'Order is not eligible for another full refund review',
        requestId,
      )
    runtimeLogger.error('finance.review_unavailable', {
      requestId,
      errorKind: 'dependency_unavailable',
    })
    return problem(
      503,
      'review_unavailable',
      'Review service temporarily unavailable',
      requestId,
    )
  }
}
