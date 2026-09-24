import { describe, expect, it } from 'vitest'

import {
  assertPaymentOrderTransition,
  normalizeCreditPackSnapshot,
  normalizePaymentOrderInput,
} from './payments'

describe('payment order policy', () => {
  it('normalizes a server-owned credit-pack snapshot and safe return path', () => {
    expect(
      normalizePaymentOrderInput({
        operationKey: ' checkout:user-1:request-1 ',
        returnPath: '/pt-PT/stories/relogios-de-jardim?payment=return',
        snapshot: {
          amountMinor: 500,
          credits: 5,
          currency: 'eur',
          packKey: 'five-credits',
        },
      }),
    ).toEqual({
      operationKey: 'checkout:user-1:request-1',
      returnPath: '/pt-PT/stories/relogios-de-jardim?payment=return',
      snapshot: {
        amountMinor: 500,
        credits: 5,
        currency: 'EUR',
        packKey: 'five-credits',
      },
    })
  })

  it('falls back when a return path is external or unknown', () => {
    expect(
      normalizePaymentOrderInput({
        operationKey: 'checkout:user-1:request-2',
        returnPath: 'https://attacker.example/return',
        snapshot: {
          amountMinor: 500,
          credits: 5,
          currency: 'EUR',
          packKey: 'five-credits',
        },
      }).returnPath,
    ).toBe('/')
  })

  it.each([
    { amountMinor: 0, credits: 5, currency: 'EUR', packKey: 'five-credits' },
    {
      amountMinor: 500.5,
      credits: 5,
      currency: 'EUR',
      packKey: 'five-credits',
    },
    { amountMinor: 500, credits: 0, currency: 'EUR', packKey: 'five-credits' },
    { amountMinor: 500, credits: 5, currency: 'EU', packKey: 'five-credits' },
    { amountMinor: 500, credits: 5, currency: 'EUR', packKey: 'Five Credits' },
  ])('rejects an invalid credit-pack snapshot: $packKey', (snapshot) => {
    expect(() => normalizeCreditPackSnapshot(snapshot)).toThrow(TypeError)
  })

  it('rejects incomplete or internally inconsistent pricing snapshots', () => {
    expect(() =>
      normalizeCreditPackSnapshot({
        amountMinor: 500,
        baseCredits: 5,
        credits: 5,
        currency: 'EUR',
        packKey: 'top-up-v1',
      }),
    ).toThrow(/complete/u)
    expect(() =>
      normalizeCreditPackSnapshot({
        amountMinor: 500,
        baseCredits: 5,
        bonusCredits: 1,
        bonusRateBps: 0,
        credits: 5,
        currency: 'EUR',
        packKey: 'top-up-v1',
        pricingVersion: 'top-up-eur-v1',
        purchaseType: 'credit_top_up',
      }),
    ).toThrow(/base plus bonus/u)
  })

  it.each([
    ['pending', 'checkout_created'],
    ['checkout_created', 'payment_pending'],
    ['checkout_created', 'fulfilled'],
    ['payment_pending', 'fulfilled'],
  ] as const)('allows %s → %s with provider evidence', (current, next) => {
    expect(() => {
      assertPaymentOrderTransition(current, next, 'provider_event')
    }).not.toThrow()
  })

  it.each([
    ['pending', 'fulfilled'],
    ['fulfilled', 'payment_pending'],
    ['canceled', 'checkout_created'],
    ['payment_pending', 'checkout_created'],
  ] as const)('rejects the illegal transition %s → %s', (current, next) => {
    expect(() => {
      assertPaymentOrderTransition(current, next, 'reconciliation')
    }).toThrow(TypeError)
  })

  it('rejects browser-return claims as transition evidence', () => {
    expect(() => {
      assertPaymentOrderTransition(
        'checkout_created',
        'fulfilled',
        'browser_return',
      )
    }).toThrow(/provider evidence/u)
  })
})
