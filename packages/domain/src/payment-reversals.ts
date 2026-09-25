export const paymentReversalKinds = [
  'refund',
  'dispute',
  'support_correction',
] as const

export const paymentReversalStatuses = [
  'requested',
  'provider_pending',
  'completed',
  'rejected',
  'canceled',
  'manual_review',
] as const

export type PaymentReversalKind = (typeof paymentReversalKinds)[number]
export type PaymentReversalStatus = (typeof paymentReversalStatuses)[number]
export type PaymentReversalTransitionSource =
  'guarded_operator' | 'provider_event' | 'reconciliation'

const allowedTransitions: Readonly<
  Record<PaymentReversalStatus, ReadonlySet<PaymentReversalStatus>>
> = {
  canceled: new Set(),
  completed: new Set(),
  manual_review: new Set(['canceled', 'provider_pending']),
  provider_pending: new Set([
    'canceled',
    'completed',
    'manual_review',
    'rejected',
  ]),
  rejected: new Set(),
  requested: new Set([
    'canceled',
    'manual_review',
    'provider_pending',
    'rejected',
  ]),
}

export function assertPaymentReversalTransition(
  current: PaymentReversalStatus,
  next: PaymentReversalStatus,
  source: unknown,
): void {
  if (
    source !== 'guarded_operator' &&
    source !== 'provider_event' &&
    source !== 'reconciliation'
  ) {
    throw new TypeError(
      'Payment reversals require trusted transition evidence.',
    )
  }
  if (!allowedTransitions[current].has(next)) {
    throw new TypeError(
      `Payment reversal cannot transition from ${current} to ${next}.`,
    )
  }
}

export function normalizeReversalReasonCode(value: string): string {
  const normalized = value.trim()
  if (
    !/^[a-z0-9]+(?:_[a-z0-9]+)*$/u.test(normalized) ||
    normalized.length > 80
  ) {
    throw new TypeError(
      'Reversal reason codes must be lowercase snake_case with at most 80 characters.',
    )
  }
  return normalized
}
