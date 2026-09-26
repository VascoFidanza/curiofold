import { describe, expect, it, vi } from 'vitest'

import type { AuthorizationContext, PaymentProvider } from '@curiofold/domain'
import {
  PaymentOrderConflictError,
  type PaymentOrderRecord,
} from '@curiofold/db'

import { createCreditCheckoutResponse } from './credit-checkout-route'
import { IdentitySessionError } from './identity'
import { PaymentProviderError } from './stripe-payment-provider'

const authorization: AuthorizationContext = {
  accountState: 'active',
  emailVerified: true,
  firstFactorVerifiedAt: null,
  secondFactorVerifiedAt: null,
  staffRoles: new Set(),
  userId: '11111111-1111-4111-8111-111111111111',
}
const pack = {
  amountMinor: 500,
  baseCredits: 5,
  bonusCredits: 0,
  bonusRateBps: 0,
  credits: 5,
  currency: 'EUR',
  packKey: 'top-up-v1',
  pricingVersion: 'top-up-eur-v1',
  purchaseType: 'credit_top_up',
} as const
const order: PaymentOrderRecord = {
  ...pack,
  createdAt: '2026-09-24T10:00:00.000Z',
  id: '22222222-2222-4222-8222-222222222222',
  operationKey: 'checkout:browser-1',
  providerCheckoutSessionId: null,
  providerKey: null,
  providerPaymentId: null,
  storyId: null,
  returnPath: '/en/stories/the-moon?source=detail',
  status: 'pending',
  updatedAt: '2026-09-24T10:00:00.000Z',
  userId: authorization.userId,
}

function request(
  body: unknown = { amountEUR: 5, returnPath: order.returnPath },
): Request {
  return new Request('https://curiofold.test/api/v1/credit-checkouts', {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': 'checkout:browser-1',
    },
    method: 'POST',
  })
}

function provider(overrides: Partial<PaymentProvider> = {}): PaymentProvider {
  return {
    createCheckoutSession: vi.fn().mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
      providerKey: 'stripe',
      providerSessionId: 'cs_test_1',
    }),
    retrieveOrder: vi.fn().mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
      providerPaymentId: null,
      providerSessionId: 'cs_test_1',
      state: 'unpaid',
    }),
    ...overrides,
  }
}

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    appUrl: 'https://curiofold.test',
    attachCheckoutSource: vi
      .fn()
      .mockResolvedValue({ ...order, status: 'checkout_created' }),
    authorizationSource: () => Promise.resolve(authorization),
    createOrderSource: vi.fn().mockResolvedValue({ created: true, order }),
    provider: provider(),
    ...overrides,
  }
}

describe('credit Checkout route', () => {
  it('derives the canonical quote from a whole-euro amount', async () => {
    const createOrderSource = vi.fn().mockResolvedValue({
      created: true,
      order,
    })
    const response = await createCreditCheckoutResponse(
      request({ amountEUR: 30, returnPath: order.returnPath }),
      'request-pricing',
      dependencies({ createOrderSource }),
    )

    expect(response.status).toBe(201)
    expect(createOrderSource).toHaveBeenCalledWith({
      operationKey: 'checkout:browser-1',
      returnPath: order.returnPath,
      snapshot: {
        amountMinor: 3_000,
        baseCredits: 30,
        bonusCredits: 5,
        bonusRateBps: 1_500,
        credits: 35,
        currency: 'EUR',
        packKey: 'top-up-v1',
        pricingVersion: 'top-up-eur-v1',
        purchaseType: 'credit_top_up',
      },
      userId: authorization.userId,
    })
  })

  it('rejects cross-origin and malformed requests before creating an order', async () => {
    const createOrderSource = vi.fn()
    const crossOrigin = request()
    crossOrigin.headers.set('Sec-Fetch-Site', 'cross-site')
    const response = await createCreditCheckoutResponse(
      crossOrigin,
      'request-cross',
      dependencies({ createOrderSource }),
    )
    expect(response.status).toBe(403)
    expect(createOrderSource).not.toHaveBeenCalled()

    const invalid = await createCreditCheckoutResponse(
      request({ amountEUR: 5, bonusCredits: 500 }),
      'request-invalid',
      dependencies({ createOrderSource }),
    )
    expect(invalid.status).toBe(400)
    expect(createOrderSource).not.toHaveBeenCalled()
  })

  it('requires authentication and verified email', async () => {
    const unauthenticated = await createCreditCheckoutResponse(
      request(),
      'request-auth',
      dependencies({
        authorizationSource: () =>
          Promise.reject(new IdentitySessionError('unauthenticated')),
      }),
    )
    expect(unauthenticated.status).toBe(401)

    const unverified = await createCreditCheckoutResponse(
      request(),
      'request-email',
      dependencies({
        authorizationSource: () =>
          Promise.resolve({ ...authorization, emailVerified: false }),
      }),
    )
    expect(unverified.status).toBe(403)
  })

  it('uses only the server-owned quote and preserves a safe return context', async () => {
    const createOrderSource = vi
      .fn()
      .mockResolvedValue({ created: true, order })
    const createCheckoutSession = vi.fn().mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
      providerKey: 'stripe',
      providerSessionId: 'cs_test_1',
    })
    const paymentProvider = provider({ createCheckoutSession })
    const response = await createCreditCheckoutResponse(
      request(),
      'request-create',
      dependencies({ createOrderSource, provider: paymentProvider }),
    )

    expect(response.status).toBe(201)
    expect(createOrderSource).toHaveBeenCalledWith({
      operationKey: 'checkout:browser-1',
      returnPath: order.returnPath,
      snapshot: pack,
      userId: authorization.userId,
    })
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 500,
        cancelPath: expect.stringContaining('payment=canceled'),
        credits: 5,
        successPath: expect.stringContaining('payment=processing'),
      }),
      `checkout:${order.id}`,
    )
    await expect(response.json()).resolves.toEqual({
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
      orderId: order.id,
      status: 'checkout_created',
    })
  })

  it('resumes an existing open provider session without creating another', async () => {
    const createCheckoutSession = vi.fn()
    const retrieveOrder = vi.fn().mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
      providerPaymentId: null,
      providerSessionId: 'cs_test_1',
      state: 'unpaid',
    })
    const paymentProvider = provider({ createCheckoutSession, retrieveOrder })
    const existing = {
      ...order,
      providerCheckoutSessionId: 'cs_test_1',
      providerKey: 'stripe',
      status: 'checkout_created' as const,
    }
    const response = await createCreditCheckoutResponse(
      request(),
      'request-retry',
      dependencies({
        createOrderSource: vi
          .fn()
          .mockResolvedValue({ created: false, order: existing }),
        provider: paymentProvider,
      }),
    )

    expect(response.status).toBe(200)
    expect(retrieveOrder).toHaveBeenCalledWith('cs_test_1')
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('returns stable, redacted errors for idempotency and provider failures', async () => {
    const conflict = await createCreditCheckoutResponse(
      request(),
      'request-conflict',
      dependencies({
        createOrderSource: () =>
          Promise.reject(new PaymentOrderConflictError()),
      }),
    )
    expect(conflict.status).toBe(409)

    const failedProvider = provider({
      createCheckoutSession: () => Promise.reject(new PaymentProviderError()),
    })
    const unavailable = await createCreditCheckoutResponse(
      request(),
      'request-provider',
      dependencies({ provider: failedProvider }),
    )
    expect(unavailable.status).toBe(503)
    expect(await unavailable.text()).not.toContain('Stripe')
  })
})
