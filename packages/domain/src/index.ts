export type Result<Value, Failure> =
  Readonly<{ ok: true; value: Value }> | Readonly<{ error: Failure; ok: false }>

export function succeed<Value>(value: Value): Result<Value, never> {
  return { ok: true, value }
}

export function fail<Failure>(error: Failure): Result<never, Failure> {
  return { error, ok: false }
}

export {
  assertPositiveCreditUnits,
  creditGrantSources,
  normalizeCreditOperationKey,
  type CreditGrantReceipt,
  type CreditGrantSource,
  type WalletBalance,
} from './credits'
export {
  can,
  safeReturnPath,
  staffRoles,
  type AccountState,
  type AuthorizationContext,
  type Capability,
  type StaffRole,
} from './identity'
export {
  readingPercentAtAnchor,
  remapReadingAnchor,
  resolveReadingProgress,
  type ReadingProgressAnchor,
  type ReadingProgressBlock,
  type ResolvedReadingProgress,
  type ResolveReadingProgressInput,
} from './reading-progress'
export {
  assertPaymentOrderTransition,
  normalizeCreditPackSnapshot,
  normalizePaymentOrderInput,
  paymentOrderStatuses,
  type CreditPackSnapshot,
  type PaymentOrderStatus,
  type PaymentProvider,
  type PaymentProviderCheckoutCommand,
  type PaymentProviderCheckoutResult,
  type PaymentProviderOrderSnapshot,
  type PaymentProviderOrderState,
  type PaymentTransitionSource,
} from './payments'
export {
  directStoryPriceMinor,
  directStoryPricingVersion,
  minimumTopUpAmountMinor,
  pricingVersion,
  quoteDirectStoryPurchase,
  quoteCreditTopUp,
  type CreditTopUpQuote,
  type DirectStoryPurchaseQuote,
} from './pricing'
export {
  assertPaymentReversalTransition,
  normalizeReversalReasonCode,
  paymentReversalKinds,
  paymentReversalStatuses,
  type PaymentReversalKind,
  type PaymentReversalStatus,
  type PaymentReversalTransitionSource,
} from './payment-reversals'
