import {
  can,
  quoteDirectStoryPurchase,
  safeReturnPath,
  type AuthorizationContext,
  type CreditPackSnapshot,
  type PaymentProvider,
} from '@curiofold/domain'
import {
  attachPaymentCheckoutSession,
  createPaymentOrder,
  findOwnedStoryState,
  isPublishedStory,
  PaymentOrderConflictError,
  type AttachPaymentCheckoutInput,
  type CreatePaymentOrderResult,
  type PaymentOrderRecord,
} from '@curiofold/db'

import { getDatabase } from './database'
import { IdentitySessionError, requireAuthorizationContext } from './identity'
import {
  PaymentProviderError,
  createStripePaymentProvider,
} from './stripe-payment-provider'
import { checkoutReturnPath } from './credit-checkout-route'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

const maximumPayloadBytes = 2_048

function hasTrustedOrigin(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

function readOperationKey(request: Request): string | null {
  const key = request.headers.get('idempotency-key')?.trim()
  if (!key || key.length > 200) return null
  return Array.from(key).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 31 || codePoint === 127
  })
    ? null
    : key
}

type Dependencies = Readonly<{
  appUrl?: string
  authorizationSource?: () => Promise<AuthorizationContext>
  createOrderSource?: (
    input: Parameters<typeof createPaymentOrder>[1],
  ) => Promise<CreatePaymentOrderResult>
  attachCheckoutSource?: (
    input: AttachPaymentCheckoutInput,
  ) => Promise<PaymentOrderRecord>
  publishedSource?: (storyId: string) => Promise<boolean>
  ownedSource?: (
    userId: string,
    storyId: string,
    locale: string,
  ) => Promise<unknown>
  provider?: PaymentProvider
}>

function problem(
  status: number,
  code: string,
  title: string,
  requestId: string,
): Response {
  return Response.json(
    { type: 'about:blank', title, status, code, requestId },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/problem+json',
      },
    },
  )
}

export async function createStoryPurchaseResponse(
  request: Request,
  requestId: string,
  dependencies: Dependencies = {},
): Promise<Response> {
  if (!hasTrustedOrigin(request))
    return problem(
      403,
      'cross_origin',
      'Cross-origin request denied',
      requestId,
    )
  const operationKey = readOperationKey(request)
  if (!operationKey)
    return problem(
      400,
      'invalid_idempotency_key',
      'A valid Idempotency-Key header is required',
      requestId,
    )
  let authorization: AuthorizationContext
  try {
    authorization = await (
      dependencies.authorizationSource ?? requireAuthorizationContext
    )()
  } catch (error) {
    if (!(error instanceof IdentitySessionError)) throw error
    return problem(
      error.code === 'unauthenticated'
        ? 401
        : error.code === 'identity_unavailable'
          ? 503
          : 403,
      error.code,
      'Authentication is required to buy a Story',
      requestId,
    )
  }
  if (!can(authorization, 'checkout.create'))
    return problem(
      403,
      'email_verification_required',
      'Verified email required',
      requestId,
    )
  let payload: { storyId: string; returnPath?: string }
  try {
    const mediaType = request.headers
      .get('content-type')
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase()
    if (mediaType !== 'application/json') throw new Error()
    const declaredLength = Number(request.headers.get('content-length') ?? 0)
    if (Number.isFinite(declaredLength) && declaredLength > maximumPayloadBytes)
      throw new Error()
    const text = await request.text()
    if (new TextEncoder().encode(text).byteLength > maximumPayloadBytes)
      throw new Error()
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error()
    const value = parsed as Record<string, unknown>
    if (
      typeof value.storyId !== 'string' ||
      !uuidPattern.test(value.storyId) ||
      (value.returnPath !== undefined && typeof value.returnPath !== 'string')
    )
      throw new Error()
    payload = {
      storyId: value.storyId,
      ...(typeof value.returnPath === 'string'
        ? { returnPath: value.returnPath }
        : {}),
    }
  } catch {
    return problem(
      400,
      'invalid_story_purchase',
      'Story purchase payload is invalid',
      requestId,
    )
  }
  const published = await (
    dependencies.publishedSource ??
    ((id) => isPublishedStory(getDatabase().client, id))
  )(payload.storyId)
  if (!published) return problem(404, 'not_found', 'Story not found', requestId)
  const path = safeReturnPath(payload.returnPath, '/')
  const locale = path.split('/')[1] ?? 'en'
  const owned = await (
    dependencies.ownedSource ??
    ((userId, storyId, language) =>
      findOwnedStoryState(getDatabase().client, userId, storyId, language))
  )(authorization.userId, payload.storyId, locale)
  if (owned)
    return problem(
      409,
      'already_owned',
      'Story is already in your Library',
      requestId,
    )
  const quote = quoteDirectStoryPurchase()
  const snapshot: CreditPackSnapshot = { ...quote, packKey: 'story-direct-v1' }
  try {
    const result = await (
      dependencies.createOrderSource ??
      ((input) => createPaymentOrder(getDatabase().client, input))
    )({
      operationKey,
      returnPath: path,
      snapshot,
      storyId: payload.storyId,
      userId: authorization.userId,
    })
    const order = result.order
    const appUrl =
      dependencies.appUrl ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://localhost:3000'
    const provider =
      dependencies.provider ??
      createStripePaymentProvider({
        appUrl,
        ...(process.env.STRIPE_SECRET_KEY
          ? { secretKey: process.env.STRIPE_SECRET_KEY }
          : {}),
      })
    if (order.providerCheckoutSessionId) {
      const existing = await provider.retrieveOrder(
        order.providerCheckoutSessionId,
      )
      if (!existing.checkoutUrl || existing.state !== 'unpaid')
        return problem(
          409,
          'checkout_not_reusable',
          'Checkout can no longer be resumed',
          requestId,
        )
      return Response.json(
        {
          checkoutUrl: existing.checkoutUrl,
          orderId: order.id,
          status: 'checkout_created',
        },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
    const checkout = await provider.createCheckoutSession(
      {
        ...snapshot,
        cancelPath: checkoutReturnPath(order.returnPath, order.id, 'canceled'),
        orderId: order.id,
        successPath: checkoutReturnPath(
          order.returnPath,
          order.id,
          'processing',
        ),
      },
      `checkout:${order.id}`,
    )
    await (
      dependencies.attachCheckoutSource ??
      ((input) => attachPaymentCheckoutSession(getDatabase().client, input))
    )({
      orderId: order.id,
      providerKey: checkout.providerKey,
      providerSessionId: checkout.providerSessionId,
    })
    return Response.json(
      {
        checkoutUrl: checkout.checkoutUrl,
        orderId: order.id,
        status: 'checkout_created',
      },
      {
        status: result.created ? 201 : 200,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  } catch (error) {
    if (error instanceof PaymentOrderConflictError)
      return problem(
        409,
        'idempotency_conflict',
        'Idempotency key conflicts with another checkout',
        requestId,
      )
    if (error instanceof PaymentProviderError)
      return problem(
        503,
        'payment_provider_unavailable',
        'Payment provider is temporarily unavailable',
        requestId,
      )
    throw error
  }
}
