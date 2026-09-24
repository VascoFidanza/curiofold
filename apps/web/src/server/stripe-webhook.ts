import { createHash } from 'node:crypto'

import type {
  PaymentProvider,
  PaymentProviderOrderSnapshot,
} from '@curiofold/domain'
import {
  processProviderEvent,
  ProviderEventConflictError,
  ProviderEventRetryableError,
  recordProviderEvent,
  type ProcessProviderEventResult,
  type RecordedProviderEvent,
  type RecordProviderEventInput,
} from '@curiofold/db'
import Stripe from 'stripe'

import { getDatabase } from './database'
import {
  createStripePaymentProvider,
  PaymentProviderError,
} from './stripe-payment-provider'

interface VerifiedStripeEvent {
  readonly createdAt: Date
  readonly eventId: string
  readonly eventType: string
  readonly sessionId: string
}

interface StripeWebhookDependencies {
  readonly configured?: boolean
  readonly process?: (
    eventId: string,
    snapshot: PaymentProviderOrderSnapshot,
  ) => Promise<ProcessProviderEventResult>
  readonly provider?: PaymentProvider
  readonly record?: (
    input: RecordProviderEventInput,
  ) => Promise<RecordedProviderEvent>
  readonly verify?: (
    payload: string,
    signature: string,
  ) => VerifiedStripeEvent | null
}

const supportedEvents = new Set([
  'checkout.session.async_payment_failed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.completed',
  'checkout.session.expired',
])
const maximumPayloadBytes = 1_048_576

export function isStripeWebhookConfigured(
  source: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(
    source.DATABASE_URL &&
    source.STRIPE_SECRET_KEY &&
    source.STRIPE_WEBHOOK_SECRET,
  )
}

function problem(status: number, code: string, title: string): Response {
  return Response.json(
    { type: 'about:blank', title, status, code },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/problem+json',
      },
    },
  )
}

export function verifyStripeEvent(
  payload: string,
  signature: string,
  webhookSecret: string,
): VerifiedStripeEvent | null {
  const stripe = new Stripe('sk_test_webhook_verification_only', {
    apiVersion: '2026-08-26.dahlia',
  })
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    webhookSecret,
  )
  if (!supportedEvents.has(event.type)) return null
  if (event.data.object.object !== 'checkout.session') {
    throw new TypeError('Stripe event object is invalid.')
  }
  return {
    createdAt: new Date(event.created * 1_000),
    eventId: event.id,
    eventType: event.type,
    sessionId: event.data.object.id,
  }
}

async function rawPayload(request: Request): Promise<string | null> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > maximumPayloadBytes)
    return null
  const payload = await request.text()
  return new TextEncoder().encode(payload).byteLength <= maximumPayloadBytes
    ? payload
    : null
}

function defaultProvider(): PaymentProvider {
  const secretKey = process.env.STRIPE_SECRET_KEY
  return createStripePaymentProvider({
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    ...(secretKey ? { secretKey } : {}),
  })
}

export async function createStripeWebhookResponse(
  request: Request,
  dependencies: StripeWebhookDependencies = {},
): Promise<Response> {
  if (
    dependencies.configured === false ||
    (dependencies.configured === undefined && !isStripeWebhookConfigured())
  ) {
    return problem(
      503,
      'payment_webhook_unavailable',
      'Payment webhook unavailable',
    )
  }

  const signature = request.headers.get('stripe-signature')
  const payload = await rawPayload(request)
  if (!signature || payload === null) {
    return problem(400, 'invalid_webhook', 'Invalid webhook')
  }

  let verified: VerifiedStripeEvent | null
  try {
    verified = (
      dependencies.verify ??
      ((body, header) =>
        verifyStripeEvent(
          body,
          header,
          process.env.STRIPE_WEBHOOK_SECRET ?? '',
        ))
    )(payload, signature)
  } catch {
    return problem(400, 'invalid_webhook_signature', 'Invalid webhook')
  }
  if (!verified) {
    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  try {
    const record =
      dependencies.record ??
      ((input) => recordProviderEvent(getDatabase().client, input))
    const recorded = await record({
      eventType: verified.eventType,
      payloadDigest: createHash('sha256').update(payload).digest('hex'),
      providerCreatedAt: verified.createdAt,
      providerEventId: verified.eventId,
      providerKey: 'stripe',
    })
    if (!recorded.created && recorded.status === 'processed') {
      return Response.json(
        { received: true, result: 'duplicate' },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const providerSnapshot = await (
      dependencies.provider ?? defaultProvider()
    ).retrieveOrder(verified.sessionId)
    if (providerSnapshot.providerSessionId !== verified.sessionId) {
      throw new ProviderEventConflictError()
    }
    const snapshot: PaymentProviderOrderSnapshot =
      verified.eventType === 'checkout.session.async_payment_failed'
        ? { ...providerSnapshot, state: 'canceled' }
        : providerSnapshot
    const process =
      dependencies.process ??
      ((eventId, providerSnapshot) =>
        processProviderEvent(getDatabase().client, {
          providerEventId: eventId,
          providerKey: 'stripe',
          snapshot: providerSnapshot,
        }))
    const result = await process(verified.eventId, snapshot)
    return Response.json(
      { received: true, result: result.outcome },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    if (error instanceof ProviderEventConflictError) {
      return problem(
        409,
        'payment_event_conflict',
        'Payment event conflicts with recorded state',
      )
    }
    if (
      error instanceof ProviderEventRetryableError ||
      error instanceof PaymentProviderError
    ) {
      return problem(
        503,
        'payment_event_retry',
        'Payment event could not be processed yet',
      )
    }
    throw error
  }
}
