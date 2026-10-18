import type {
  PaymentProvider,
  PaymentProviderCheckoutCommand,
  PaymentProviderCheckoutResult,
  PaymentProviderOrderSnapshot,
} from '@curiofold/domain'
import Stripe from 'stripe'

interface StripeCheckoutClient {
  readonly checkout: {
    readonly sessions: {
      create(
        params: Stripe.Checkout.SessionCreateParams,
        options?: Stripe.RequestOptions,
      ): Promise<Stripe.Checkout.Session>
      retrieve(id: string): Promise<Stripe.Checkout.Session>
    }
  }
}

interface StripePaymentProviderOptions {
  readonly appUrl: string
  readonly client?: StripeCheckoutClient
  readonly secretKey?: string
  readonly requestTimeoutMs?: number
  readonly maxNetworkRetries?: number
}

export class PaymentProviderError extends Error {
  override readonly name = 'PaymentProviderError'
  readonly retryable: boolean

  constructor(retryable = true) {
    super('Payment provider request failed.')
    this.retryable = retryable
  }
}

function absoluteReturnUrl(appUrl: string, path: string): string {
  const base = new URL(appUrl)
  const target = new URL(path, base)
  if (target.origin !== base.origin) {
    throw new PaymentProviderError(false)
  }
  return target.toString()
}

function checkoutUrl(value: string | null): string {
  if (!value) {
    throw new PaymentProviderError(false)
  }
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') {
      throw new PaymentProviderError(false)
    }
    return parsed.toString()
  } catch (error) {
    if (error instanceof PaymentProviderError) throw error
    throw new PaymentProviderError(false)
  }
}

function snapshotState(
  session: Stripe.Checkout.Session,
): PaymentProviderOrderSnapshot['state'] {
  if (
    session.payment_status === 'paid' ||
    session.payment_status === 'no_payment_required'
  ) {
    return 'paid'
  }
  if (session.status === 'expired') return 'canceled'
  if (session.status === 'complete') return 'payment_pending'
  return 'unpaid'
}

export function createStripePaymentProvider(
  options: StripePaymentProviderOptions,
): PaymentProvider {
  const secretKey = options.secretKey?.trim()
  if (!options.client && !secretKey) {
    throw new PaymentProviderError(false)
  }

  let client = options.client
  const stripe = (): StripeCheckoutClient => {
    if (!client) {
      if (!secretKey) throw new PaymentProviderError(false)
      client = new Stripe(secretKey, {
        apiVersion: '2026-08-26.dahlia',
        appInfo: { name: 'Curiofold', version: '1.0.0' },
        maxNetworkRetries: options.maxNetworkRetries ?? 2,
        timeout: options.requestTimeoutMs ?? 80_000,
      })
    }
    return client
  }

  return {
    async createCheckoutSession(
      command: PaymentProviderCheckoutCommand,
      idempotencyKey: string,
    ): Promise<PaymentProviderCheckoutResult> {
      // Activation controls only NEW charges. Never disable order recovery/fulfilment.
      if (
        /^(?:sk|rk)_live_/u.test(secretKey ?? '') &&
        (process.env.NEXT_PUBLIC_ENVIRONMENT !== 'production' ||
          process.env.CURIOFOLD_LIVE_PAYMENTS_ENABLED !== 'true')
      ) {
        throw new PaymentProviderError(false)
      }
      try {
        const session = await stripe().checkout.sessions.create(
          {
            cancel_url: absoluteReturnUrl(options.appUrl, command.cancelPath),
            client_reference_id: command.orderId,
            line_items: [
              {
                price_data: {
                  currency: command.currency.toLowerCase(),
                  product_data: {
                    name:
                      command.purchaseType === 'individual_story'
                        ? 'Curiofold Story'
                        : `${String(command.credits)} Curiofold credits`,
                  },
                  unit_amount: command.amountMinor,
                },
                quantity: 1,
              },
            ],
            metadata: { curiofold_order_id: command.orderId },
            mode: 'payment',
            payment_intent_data: {
              metadata: { curiofold_order_id: command.orderId },
            },
            success_url: absoluteReturnUrl(options.appUrl, command.successPath),
          },
          { idempotencyKey },
        )

        return {
          checkoutUrl: checkoutUrl(session.url),
          providerKey: 'stripe',
          providerSessionId: session.id,
        }
      } catch (error) {
        if (error instanceof PaymentProviderError) throw error
        throw new PaymentProviderError(true)
      }
    },

    async retrieveOrder(
      providerSessionId: string,
    ): Promise<PaymentProviderOrderSnapshot> {
      try {
        const session =
          await stripe().checkout.sessions.retrieve(providerSessionId)
        return {
          checkoutUrl: session.url ? checkoutUrl(session.url) : null,
          providerPaymentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : (session.payment_intent?.id ?? null),
          providerSessionId: session.id,
          state: snapshotState(session),
        }
      } catch (error) {
        if (error instanceof PaymentProviderError) throw error
        throw new PaymentProviderError(true)
      }
    },
  }
}
