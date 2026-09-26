import { describe, expect, it, vi } from 'vitest'

import type { AuthorizationContext, PaymentProvider } from '@curiofold/domain'
import type { PaymentOrderRecord } from '@curiofold/db'

import { createStoryPurchaseResponse } from './story-purchase-route'

const authorization: AuthorizationContext = {
  accountState: 'active',
  emailVerified: true,
  firstFactorVerifiedAt: null,
  secondFactorVerifiedAt: null,
  staffRoles: new Set(),
  userId: '11111111-1111-4111-8111-111111111111',
}
const storyId = '00000000-0000-4000-8000-000000000001'
const order: PaymentOrderRecord = {
  amountMinor: 130,
  baseCredits: 0,
  bonusCredits: 0,
  bonusRateBps: 0,
  createdAt: '2026-09-24T10:00:00.000Z',
  credits: 0,
  currency: 'EUR',
  id: '22222222-2222-4222-8222-222222222222',
  operationKey: 'story:purchase-1',
  packKey: 'story-direct-v1',
  pricingVersion: 'story-direct-eur-v1',
  providerCheckoutSessionId: null,
  providerKey: null,
  providerPaymentId: null,
  purchaseType: 'individual_story',
  returnPath: '/en/stories/clockwork-gardens',
  status: 'pending',
  storyId,
  updatedAt: '2026-09-24T10:00:00.000Z',
  userId: authorization.userId,
}

function request(): Request {
  return new Request('https://curiofold.test/api/v1/story-purchases', {
    body: JSON.stringify({
      returnPath: '/en/stories/clockwork-gardens',
      storyId,
    }),
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': 'story:purchase-1',
    },
    method: 'POST',
  })
}

function provider(): PaymentProvider {
  return {
    createCheckoutSession: vi.fn().mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_story',
      providerKey: 'stripe',
      providerSessionId: 'cs_story',
    }),
    retrieveOrder: vi.fn(),
  }
}

describe('Story purchase route', () => {
  it('creates an exact €1.30 checkout without wallet credits', async () => {
    const createOrderSource = vi.fn().mockResolvedValue({
      created: true,
      order,
    })
    const response = await createStoryPurchaseResponse(
      request(),
      'request-story-purchase',
      {
        appUrl: 'https://curiofold.test',
        attachCheckoutSource: vi
          .fn()
          .mockResolvedValue({ ...order, status: 'checkout_created' }),
        authorizationSource: () => Promise.resolve(authorization),
        createOrderSource,
        ownedSource: () => Promise.resolve(null),
        provider: provider(),
        publishedSource: () => Promise.resolve(true),
      },
    )

    expect(response.status).toBe(201)
    expect(createOrderSource).toHaveBeenCalledWith({
      operationKey: 'story:purchase-1',
      returnPath: '/en/stories/clockwork-gardens',
      snapshot: {
        amountMinor: 130,
        credits: 0,
        currency: 'EUR',
        packKey: 'story-direct-v1',
        pricingVersion: 'story-direct-eur-v1',
        purchaseType: 'individual_story',
      },
      storyId,
      userId: authorization.userId,
    })
    await expect(response.json()).resolves.toMatchObject({
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_story',
      orderId: order.id,
      status: 'checkout_created',
    })
  })

  it('rejects cross-origin requests before creating an order', async () => {
    const createOrderSource = vi.fn()
    const crossOrigin = request()
    crossOrigin.headers.set('Sec-Fetch-Site', 'cross-site')
    const response = await createStoryPurchaseResponse(
      crossOrigin,
      'request-cross-origin',
      {
        authorizationSource: () => Promise.resolve(authorization),
        createOrderSource,
      },
    )
    expect(response.status).toBe(403)
    expect(createOrderSource).not.toHaveBeenCalled()
  })
})
