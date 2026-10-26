import { afterEach, describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'

import {
  createStripePaymentProvider,
  PaymentProviderError,
} from './stripe-payment-provider'
import { isLiveCommerceDisclosureReady } from './legal-information'

vi.mock('./legal-information', () => ({
  isLiveCommerceDisclosureReady: vi.fn(() => true),
}))

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
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.mocked(isLiveCommerceDisclosureReady).mockReset().mockReturnValue(true)
  })

  it.each(['sk_live_', 'rk_live_'])(
    'refuses new %s Checkout without effective disclosures but preserves recovery',
    async (keyPrefix) => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'production')
      vi.stubEnv('CURIOFOLD_LIVE_PAYMENTS_ENABLED', 'true')
      vi.mocked(isLiveCommerceDisclosureReady).mockReturnValue(false)
      const create = vi.fn()
      const retrieve = vi.fn().mockResolvedValue(session())
      const provider = createStripePaymentProvider({
        appUrl: 'https://curiofold.test',
        secretKey: `${keyPrefix}fixture_not_a_secret`,
        client: { checkout: { sessions: { create, retrieve } } },
      })
      await expect(
        provider.createCheckoutSession(
          {
            amountMinor: 130,
            cancelPath: '/account',
            credits: 0,
            currency: 'EUR',
            orderId: 'order-1',
            packKey: 'story',
            purchaseType: 'individual_story',
            successPath: '/library',
          },
          'operation',
        ),
      ).rejects.toMatchObject({ retryable: false })
      expect(create).not.toHaveBeenCalled()
      await expect(
        provider.retrieveOrder('cs_test_order_1'),
      ).resolves.toBeDefined()
      expect(retrieve).toHaveBeenCalledOnce()
    },
  )

  it('keeps Sandbox Checkout available when policy drafts are pending', async () => {
    vi.mocked(isLiveCommerceDisclosureReady).mockReturnValue(false)
    const create = vi.fn().mockResolvedValue(session())
    const provider = createStripePaymentProvider({
      appUrl: 'https://curiofold.test',
      secretKey: 'sk_test_fixture_not_a_secret',
      client: { checkout: { sessions: { create, retrieve: vi.fn() } } },
    })
    await expect(
      provider.createCheckoutSession(
        {
          amountMinor: 500,
          cancelPath: '/account',
          credits: 5,
          currency: 'EUR',
          orderId: 'order-1',
          packKey: 'top-up',
          successPath: '/credits',
        },
        'operation',
      ),
    ).resolves.toBeDefined()
    expect(create).toHaveBeenCalledOnce()
  })

  it.each([
    ['preview', 'true', 'sk_live_', false],
    ['production', '', 'sk_live_', false],
    ['production', 'false', 'sk_live_', false],
    ['production', 'true', 'sk_live_', true],
    ['preview', 'true', 'rk_live_', false],
    ['production', '', 'rk_live_', false],
    ['preview', '', 'sk_test_', true],
    ['preview', '', 'rk_test_', true],
  ])(
    'gates Checkout in %s with activation %s and key type %s',
    async (environment, activation, keyPrefix, allowed) => {
      vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', environment)
      vi.stubEnv('CURIOFOLD_LIVE_PAYMENTS_ENABLED', activation)
      const create = vi.fn().mockResolvedValue(session())
      const retrieve = vi.fn().mockResolvedValue(session())
      const provider = createStripePaymentProvider({
        appUrl: 'https://curiofold.test',
        secretKey: `${keyPrefix}fixture_not_a_secret`,
        client: { checkout: { sessions: { create, retrieve } } },
      })
      const checkout = provider.createCheckoutSession(
        {
          amountMinor: 130,
          cancelPath: '/account',
          credits: 0,
          currency: 'EUR',
          orderId: 'order-1',
          packKey: 'story',
          successPath: '/library',
          purchaseType: 'individual_story',
        },
        'operation',
      )
      if (allowed) await expect(checkout).resolves.toBeDefined()
      else {
        await expect(checkout).rejects.toMatchObject({ retryable: false })
        expect(create).not.toHaveBeenCalled()
      }
      await expect(
        provider.retrieveOrder('cs_test_order_1'),
      ).resolves.toBeDefined()
      expect(retrieve).toHaveBeenCalledOnce()
    },
  )
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

  it('creates a direct Story Checkout for exactly 130 EUR cents without calling it credits', async () => {
    const create = vi.fn().mockResolvedValue(session())
    const provider = createStripePaymentProvider({
      appUrl: 'https://curiofold.test',
      client: { checkout: { sessions: { create, retrieve: vi.fn() } } },
    })

    await provider.createCheckoutSession(
      {
        amountMinor: 130,
        cancelPath: '/en/stories/clockwork?payment=canceled',
        credits: 0,
        currency: 'EUR',
        orderId: 'story-order-1',
        packKey: 'story-direct-v1',
        purchaseType: 'individual_story',
        successPath: '/en/stories/clockwork?payment=processing',
      },
      'checkout:story-order-1',
    )

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'eur',
              product_data: { name: 'Curiofold Story' },
              unit_amount: 130,
            }),
          }),
        ],
      }),
      { idempotencyKey: 'checkout:story-order-1' },
    )
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
