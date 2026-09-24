import { describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'

import {
  createStripePaymentProvider,
  PaymentProviderError,
} from './stripe-payment-provider'

function session(
  overrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Checkout.Session {
  return {
    id: 'cs_test_order_1',
    object: 'checkout.session',
    payment_intent: null,
    payment_status: 'unpaid',
    status: 'open',
    url: 'https://checkout.stripe.com/c/pay/cs_test_order_1',
    ...overrides,
  } as Stripe.Checkout.Session
}

describe('Stripe payment provider', () => {
  it('creates hosted Checkout from the trusted order snapshot', async () => {
    const create = vi.fn().mockResolvedValue(session())
    const provider = createStripePaymentProvider({
      appUrl: 'https://curiofold.test',
      client: { checkout: { sessions: { create, retrieve: vi.fn() } } },
    })

    const result = await provider.createCheckoutSession(
      {
        amountMinor: 900,
        cancelPath: '/en/story/a?payment=canceled',
        credits: 10,
        currency: 'EUR',
        orderId: 'order-1',
        packKey: 'ten-credits',
        successPath: '/en/story/a?payment=processing',
      },
      'checkout:order-1',
    )

    expect(result).toEqual({
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_order_1',
      providerKey: 'stripe',
      providerSessionId: 'cs_test_order_1',
    })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_url: 'https://curiofold.test/en/story/a?payment=canceled',
        client_reference_id: 'order-1',
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'eur',
              unit_amount: 900,
            }),
          }),
        ],
        metadata: { curiofold_order_id: 'order-1' },
        mode: 'payment',
        success_url: 'https://curiofold.test/en/story/a?payment=processing',
      }),
      { idempotencyKey: 'checkout:order-1' },
    )
  })

  it('maps provider state without treating a browser redirect as fulfilment', async () => {
    const retrieve = vi.fn().mockResolvedValue(
      session({
        payment_intent: 'pi_test_1',
        payment_status: 'paid',
        status: 'complete',
      }),
    )
    const provider = createStripePaymentProvider({
      appUrl: 'https://curiofold.test',
      client: { checkout: { sessions: { create: vi.fn(), retrieve } } },
    })

    await expect(provider.retrieveOrder('cs_test_order_1')).resolves.toEqual({
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_order_1',
      providerPaymentId: 'pi_test_1',
      providerSessionId: 'cs_test_order_1',
      state: 'paid',
    })
  })

  it('redacts provider failures and rejects non-HTTPS checkout URLs', async () => {
    const providerFailure = createStripePaymentProvider({
      appUrl: 'https://curiofold.test',
      client: {
        checkout: {
          sessions: {
            create: vi
              .fn()
              .mockRejectedValue(new Error('secret provider payload')),
            retrieve: vi.fn(),
          },
        },
      },
    })
    await expect(
      providerFailure.createCheckoutSession(
        {
          amountMinor: 100,
          cancelPath: '/',
          credits: 1,
          currency: 'EUR',
          orderId: 'order-1',
          packKey: 'one-credit',
          successPath: '/',
        },
        'checkout:order-1',
      ),
    ).rejects.toMatchObject({ message: 'Payment provider request failed.' })

    const insecureUrl = createStripePaymentProvider({
      appUrl: 'https://curiofold.test',
      client: {
        checkout: {
          sessions: {
            create: vi
              .fn()
              .mockResolvedValue(session({ url: 'http://stripe.test' })),
            retrieve: vi.fn(),
          },
        },
      },
    })
    await expect(
      insecureUrl.createCheckoutSession(
        {
          amountMinor: 100,
          cancelPath: '/',
          credits: 1,
          currency: 'EUR',
          orderId: 'order-1',
          packKey: 'one-credit',
          successPath: '/',
        },
        'checkout:order-1',
      ),
    ).rejects.toBeInstanceOf(PaymentProviderError)
  })
})
