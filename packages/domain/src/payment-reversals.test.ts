import { describe, expect, it } from 'vitest'

import {
  assertPaymentReversalTransition,
  normalizeReversalReasonCode,
} from './payment-reversals'

describe('payment reversal policy', () => {
  it.each([
    ['requested', 'provider_pending', 'guarded_operator'],
    ['requested', 'manual_review', 'guarded_operator'],
    ['provider_pending', 'completed', 'provider_event'],
    ['provider_pending', 'rejected', 'reconciliation'],
    ['manual_review', 'provider_pending', 'guarded_operator'],
  ] as const)('allows %s → %s with %s evidence', (current, next, source) => {
    expect(() => {
      assertPaymentReversalTransition(current, next, source)
    }).not.toThrow()
  })

  it.each([
    ['requested', 'completed'],
    ['completed', 'manual_review'],
    ['rejected', 'provider_pending'],
    ['canceled', 'requested'],
  ] as const)('rejects the illegal transition %s → %s', (current, next) => {
    expect(() => {
      assertPaymentReversalTransition(current, next, 'provider_event')
    }).toThrow(TypeError)
  })

  it('normalizes bounded reason codes and rejects free text', () => {
    expect(normalizeReversalReasonCode(' customer_request ')).toBe(
      'customer_request',
    )
    expect(() =>
      normalizeReversalReasonCode('Customer asked for refund'),
    ).toThrow(TypeError)
  })
})
