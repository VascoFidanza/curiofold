import {
  assertPositiveCreditUnits,
  normalizeCreditOperationKey,
} from './credits'
import { safeReturnPath } from './identity'

export const paymentOrderStatuses = [
  'pending',
  'checkout_created',
  'payment_pending',
  'fulfilled',
  'canceled',
] as const

export type PaymentOrderStatus = (typeof paymentOrderStatuses)[number]
export type PaymentTransitionSource = 'provider_event' | 'reconciliation'

export interface CreditPackSnapshot {
  readonly amountMinor: number
  readonly baseCredits?: number
  readonly bonusCredits?: number
  readonly bonusRateBps?: number
  readonly credits: number
  readonly currency: string
  readonly packKey: string
  readonly pricingVersion?: string
  readonly purchaseType?: 'credit_top_up' | 'individual_story'
}

export interface PaymentProviderCheckoutCommand extends CreditPackSnapshot {
  readonly cancelPath: string
  readonly orderId: string
  readonly successPath: string
}

export interface PaymentProviderCheckoutResult {
  readonly checkoutUrl: string
  readonly providerKey: string
  readonly providerSessionId: string
}

export type PaymentProviderOrderState =
  'canceled' | 'paid' | 'payment_pending' | 'unpaid'

export interface PaymentProviderOrderSnapshot {
  readonly checkoutUrl: string | null
  readonly providerPaymentId: string | null
  readonly providerSessionId: string
  readonly state: PaymentProviderOrderState
}

export interface PaymentProvider {
  createCheckoutSession(
    command: PaymentProviderCheckoutCommand,
    idempotencyKey: string,
  ): Promise<PaymentProviderCheckoutResult>
  retrieveOrder(
    providerSessionId: string,
  ): Promise<PaymentProviderOrderSnapshot>
}

const maximumPaymentAmountMinor = 2_147_483_647
const packKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const currencyPattern = /^[A-Z]{3}$/u

export function normalizeCreditPackSnapshot(
  snapshot: CreditPackSnapshot,
): CreditPackSnapshot {
  const packKey = snapshot.packKey.trim()
  const currency = snapshot.currency.trim().toUpperCase()

  if (!packKeyPattern.test(packKey) || packKey.length > 80) {
    throw new TypeError(
      'Credit-pack keys must be lowercase kebab-case with at most 80 characters.',
    )
  }
  if (!currencyPattern.test(currency)) {
    throw new TypeError('Payment currencies must be three-letter ISO codes.')
  }
  if (
    !Number.isSafeInteger(snapshot.amountMinor) ||
    snapshot.amountMinor <= 0 ||
    snapshot.amountMinor > maximumPaymentAmountMinor
  ) {
    throw new TypeError('Payment amounts must be positive integer minor units.')
  }
  assertPositiveCreditUnits(snapshot.credits)
  if (
    snapshot.baseCredits !== undefined &&
    (!Number.isSafeInteger(snapshot.baseCredits) || snapshot.baseCredits <= 0)
  ) {
    throw new TypeError('Base credits must be a positive integer.')
  }
  if (
    snapshot.bonusCredits !== undefined &&
    (!Number.isSafeInteger(snapshot.bonusCredits) || snapshot.bonusCredits < 0)
  ) {
    throw new TypeError('Bonus credits must be a non-negative integer.')
  }
  if (
    snapshot.bonusRateBps !== undefined &&
    (!Number.isSafeInteger(snapshot.bonusRateBps) ||
      snapshot.bonusRateBps < 0 ||
      snapshot.bonusRateBps > 1_800)
  ) {
    throw new TypeError('Bonus rates must be between 0 and 1800 basis points.')
  }
  if (
    snapshot.pricingVersion !== undefined &&
    (!snapshot.pricingVersion.trim() || snapshot.pricingVersion.length > 80)
  ) {
    throw new TypeError('Pricing versions must be non-empty and bounded.')
  }

  return {
    amountMinor: snapshot.amountMinor,
    ...(snapshot.baseCredits === undefined
      ? {}
      : { baseCredits: snapshot.baseCredits }),
    ...(snapshot.bonusCredits === undefined
      ? {}
      : { bonusCredits: snapshot.bonusCredits }),
    ...(snapshot.bonusRateBps === undefined
      ? {}
      : { bonusRateBps: snapshot.bonusRateBps }),
    credits: snapshot.credits,
    currency,
    packKey,
    ...(snapshot.pricingVersion === undefined
      ? {}
      : { pricingVersion: snapshot.pricingVersion }),
    ...(snapshot.purchaseType === undefined
      ? {}
      : { purchaseType: snapshot.purchaseType }),
  }
}

export function normalizePaymentOrderInput(input: {
  readonly operationKey: string
  readonly returnPath: string | null | undefined
  readonly snapshot: CreditPackSnapshot
}): Readonly<{
  operationKey: string
  returnPath: string
  snapshot: CreditPackSnapshot
}> {
  return {
    operationKey: normalizeCreditOperationKey(input.operationKey),
    returnPath: safeReturnPath(input.returnPath),
    snapshot: normalizeCreditPackSnapshot(input.snapshot),
  }
}

const allowedTransitions: Readonly<
  Record<PaymentOrderStatus, ReadonlySet<PaymentOrderStatus>>
> = {
  canceled: new Set(),
  checkout_created: new Set(['payment_pending', 'fulfilled', 'canceled']),
  fulfilled: new Set(),
  payment_pending: new Set(['fulfilled', 'canceled']),
  pending: new Set(['checkout_created', 'canceled']),
}

export function assertPaymentOrderTransition(
  current: PaymentOrderStatus,
  next: PaymentOrderStatus,
  source: unknown,
): void {
  if (source !== 'provider_event' && source !== 'reconciliation') {
    throw new TypeError(
      'Payment-order transitions require reconciled provider evidence.',
    )
  }
  if (!allowedTransitions[current].has(next)) {
    throw new TypeError(
      `Payment order cannot transition from ${current} to ${next}.`,
    )
  }
}
