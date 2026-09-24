import {
  can,
  type AuthorizationContext,
  type CreditPackSnapshot,
  type PaymentProvider,
} from '@curiofold/domain'
import {
  attachPaymentCheckoutSession,
  createPaymentOrder,
  PaymentOrderConflictError,
  type AttachPaymentCheckoutInput,
  type CreatePaymentOrderInput,
  type CreatePaymentOrderResult,
  type PaymentOrderRecord,
} from '@curiofold/db'

import {
  CreditPackConfigurationError,
  findConfiguredCreditPack,
} from './credit-packs'
import { getDatabase } from './database'
import { IdentitySessionError, requireAuthorizationContext } from './identity'
import {
  createStripePaymentProvider,
  PaymentProviderError,
} from './stripe-payment-provider'

type AuthorizationSource = () => Promise<AuthorizationContext>
type PackSource = (packKey: string) => CreditPackSnapshot | null
type CreateOrderSource = (
  input: CreatePaymentOrderInput,
) => Promise<CreatePaymentOrderResult>
type AttachCheckoutSource = (
  input: AttachPaymentCheckoutInput,
) => Promise<PaymentOrderRecord>

interface CreditCheckoutDependencies {
  readonly appUrl?: string
  readonly attachCheckoutSource?: AttachCheckoutSource
  readonly authorizationSource?: AuthorizationSource
  readonly createOrderSource?: CreateOrderSource
  readonly packSource?: PackSource
  readonly provider?: PaymentProvider
}

interface CheckoutPayload {
  readonly packId: string
  readonly returnPath?: string
}

const maximumPayloadBytes = 2_048
const maximumOperationKeyLength = 200
const packKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

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
  if (!key || key.length > maximumOperationKeyLength) return null
  return Array.from(key).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 31 || codePoint === 127
  })
    ? null
    : key
}

async function readPayload(request: Request): Promise<CheckoutPayload | null> {
  const mediaType = request.headers
    .get('content-type')
    ?.split(';', 1)[0]
    ?.trim()
    .toLowerCase()
  if (mediaType !== 'application/json') return null

  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > maximumPayloadBytes)
    return null

  try {
    const text = await request.text()
    if (new TextEncoder().encode(text).byteLength > maximumPayloadBytes)
      return null
    const value = JSON.parse(text) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const candidate = value as Record<string, unknown>
    if (
      Object.keys(candidate).some(
        (key) => key !== 'packId' && key !== 'returnPath',
      ) ||
      typeof candidate.packId !== 'string' ||
      !packKeyPattern.test(candidate.packId) ||
      candidate.packId.length > 80 ||
      (candidate.returnPath !== undefined &&
        typeof candidate.returnPath !== 'string')
    ) {
      return null
    }
    return candidate.returnPath === undefined
      ? { packId: candidate.packId }
      : { packId: candidate.packId, returnPath: candidate.returnPath }
  } catch {
    return null
  }
}

export function checkoutReturnPath(
  returnPath: string,
  orderId: string,
  state: 'canceled' | 'processing',
): string {
  const url = new URL(returnPath, 'https://curiofold.invalid')
  url.searchParams.set('payment_order', orderId)
  url.searchParams.set('payment', state)
  return `${url.pathname}${url.search}${url.hash}`
}

function defaultProvider(appUrl: string): PaymentProvider {
  const secretKey = process.env.STRIPE_SECRET_KEY
  return createStripePaymentProvider({
    appUrl,
    ...(secretKey ? { secretKey } : {}),
  })
}

export async function createCreditCheckoutResponse(
  request: Request,
  requestId: string,
  dependencies: CreditCheckoutDependencies = {},
): Promise<Response> {
  if (!hasTrustedOrigin(request)) {
    return problem(
      403,
      'cross_origin',
      'Cross-origin request denied',
      requestId,
    )
  }

  const operationKey = readOperationKey(request)
  if (!operationKey) {
    return problem(
      400,
      'invalid_idempotency_key',
      'A valid Idempotency-Key header is required',
      requestId,
    )
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

  if (!can(authorization, 'checkout.create')) {
    return problem(
      403,
      'email_verification_required',
      'Verified email required',
      requestId,
    )
  }

  const payload = await readPayload(request)
  if (!payload) {
    return problem(
      400,
      'invalid_checkout',
      'Checkout payload is invalid',
      requestId,
    )
  }

  let snapshot: CreditPackSnapshot | null
  try {
    snapshot = (dependencies.packSource ?? findConfiguredCreditPack)(
      payload.packId,
    )
  } catch (error) {
    if (!(error instanceof CreditPackConfigurationError)) throw error
    return problem(
      503,
      'checkout_unavailable',
      'Checkout is temporarily unavailable',
      requestId,
      { 'Retry-After': '60' },
    )
  }
  if (!snapshot) {
    return problem(
      400,
      'unknown_credit_pack',
      'Credit pack is unavailable',
      requestId,
    )
  }

  try {
    const createOrder =
      dependencies.createOrderSource ??
      ((input) => createPaymentOrder(getDatabase().client, input))
    const result = await createOrder({
      operationKey,
      returnPath: payload.returnPath ?? null,
      snapshot,
      userId: authorization.userId,
    })
    const order = result.order
    const appUrl =
      dependencies.appUrl ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://localhost:3000'
    const provider = dependencies.provider ?? defaultProvider(appUrl)

    if (order.providerCheckoutSessionId) {
      const existing = await provider.retrieveOrder(
        order.providerCheckoutSessionId,
      )
      if (!existing.checkoutUrl || existing.state !== 'unpaid') {
        return problem(
          409,
          'checkout_not_reusable',
          'Checkout can no longer be resumed',
          requestId,
        )
      }
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

    const attachCheckout =
      dependencies.attachCheckoutSource ??
      ((input) => attachPaymentCheckoutSession(getDatabase().client, input))
    await attachCheckout({
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
    if (error instanceof PaymentOrderConflictError) {
      return problem(
        409,
        'idempotency_conflict',
        'Idempotency key conflicts with another checkout',
        requestId,
      )
    }
    if (error instanceof PaymentProviderError) {
      return problem(
        503,
        'payment_provider_unavailable',
        'Payment provider is temporarily unavailable',
        requestId,
        { 'Retry-After': '30' },
      )
    }
    throw error
  }
}
