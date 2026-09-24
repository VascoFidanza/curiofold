import { describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'

import type { PaymentProvider } from '@curiofold/domain'
import { ProviderEventRetryableError } from '@curiofold/db'

import {
  createStripeWebhookResponse,
  verifyStripeEvent,
} from './stripe-webhook'

const webhookSecret = 'whsec_test_curiofold'
const nowSeconds = Math.floor(Date.now() / 1_000)
const payload = JSON.stringify({
  id: 'evt_test_paid_order',
  object: 'event',
  api_version: '2026-08-26.dahlia',
  created: nowSeconds,
  data: { object: { id: 'cs_test_paid_order', object: 'checkout.session' } },
  livemode: false,
  pending_webhooks: 1,
  request: null,
  type: 'checkout.session.completed',
})

function request(body = payload, signature = 'test-signature'): Request {
  return new Request('https://curiofold.test/api/webhooks/stripe', {
    body,
    headers: { 'Stripe-Signature': signature },
    method: 'POST',
  })
}

function provider(): PaymentProvider {
  return {
    createCheckoutSession: vi.fn(),
    retrieveOrder: vi.fn().mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_paid_order',
      providerPaymentId: 'pi_test_paid_order',
      providerSessionId: 'cs_test_paid_order',
      state: 'paid',
    }),
  }
}

describe('Stripe webhook boundary', () => {
  it('verifies a signed raw payload and rejects tampering', () => {
    const stripe = new Stripe('sk_test_signature_fixture', {
      apiVersion: '2026-08-26.dahlia',
    })
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    })

    expect(verifyStripeEvent(payload, signature, webhookSecret)).toMatchObject({
      eventId: 'evt_test_paid_order',
      eventType: 'checkout.session.completed',
      sessionId: 'cs_test_paid_order',
    })
    expect(() =>
      verifyStripeEvent(`${payload} `, signature, webhookSecret),
    ).toThrow()
  })

  it('persists before provider reconciliation and returns the atomic outcome', async () => {
    const orderProvider = provider()
    const record = vi.fn().mockResolvedValue({
      created: true,
      id: 'provider-event-id',
      status: 'pending',
    })
    const process = vi.fn().mockResolvedValue({
      orderId: 'order-id',
      outcome: 'fulfilled',
    })
    const response = await createStripeWebhookResponse(request(), {
      configured: true,
      process,
      provider: orderProvider,
      record,
      verify: () => ({
        createdAt: new Date(nowSeconds * 1_000),
        eventId: 'evt_test_paid_order',
        eventType: 'checkout.session.completed',
        sessionId: 'cs_test_paid_order',
      }),
    })

    expect(response.status).toBe(200)
    expect(record).toHaveBeenCalledBefore(process)
    expect(process).toHaveBeenCalledWith(
      'evt_test_paid_order',
      expect.objectContaining({ state: 'paid' }),
    )
    await expect(response.json()).resolves.toEqual({
      received: true,
      result: 'fulfilled',
    })
  })

  it('short-circuits an already processed delivery without calling Stripe again', async () => {
    const retrieveOrder = vi.fn()
    const response = await createStripeWebhookResponse(request(), {
      configured: true,
      provider: { ...provider(), retrieveOrder },
      record: vi.fn().mockResolvedValue({
        created: false,
        id: 'provider-event-id',
        status: 'processed',
      }),
      verify: () => ({
        createdAt: new Date(nowSeconds * 1_000),
        eventId: 'evt_test_paid_order',
        eventType: 'checkout.session.completed',
        sessionId: 'cs_test_paid_order',
      }),
    })

    expect(response.status).toBe(200)
    expect(retrieveOrder).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      result: 'duplicate',
    })
  })

  it('fails safely for invalid, unsupported and retryable deliveries', async () => {
    const invalid = await createStripeWebhookResponse(request(), {
      configured: true,
      verify: () => {
        throw new Error('signature details')
      },
    })
    expect(invalid.status).toBe(400)
    expect(await invalid.text()).not.toContain('signature details')

    const unsupported = await createStripeWebhookResponse(request(), {
      configured: true,
      verify: () => null,
    })
    expect(unsupported.status).toBe(204)

    const retry = await createStripeWebhookResponse(request(), {
      configured: true,
      process: () => Promise.reject(new ProviderEventRetryableError()),
      provider: provider(),
      record: vi
        .fn()
        .mockResolvedValue({ created: true, id: 'id', status: 'pending' }),
      verify: () => ({
        createdAt: new Date(nowSeconds * 1_000),
        eventId: 'evt_test_paid_order',
        eventType: 'checkout.session.completed',
        sessionId: 'cs_test_paid_order',
      }),
    })
    expect(retry.status).toBe(503)
    await expect(retry.json()).resolves.toMatchObject({
      code: 'payment_event_retry',
    })
  })
})
