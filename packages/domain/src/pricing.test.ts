import { describe, expect, it } from 'vitest'

import { quoteCreditTopUp, quoteDirectStoryPurchase } from './pricing'

describe('canonical EUR credit top-up pricing', () => {
  it.each([
    [5, 5, 0, 5],
    [9, 9, 0, 9],
    [10, 11, 1_000, 11],
    [19, 21, 1_000, 21],
    [20, 23, 1_500, 23],
    [23, 26, 1_500, 26],
    [27, 31, 1_500, 31],
    [30, 35, 1_500, 35],
    [49, 56, 1_500, 56],
    [50, 59, 1_700, 59],
    [99, 116, 1_700, 116],
    [100, 118, 1_800, 118],
    [153, 181, 1_800, 181],
  ])(
    'quotes €%i as %i credits at %i bps',
    (amountEUR, totalCredits, bonusRateBps, expectedTotal) => {
      const quote = quoteCreditTopUp(amountEUR * 100)
      expect(quote.totalCredits).toBe(expectedTotal)
      expect(quote.bonusRateBps).toBe(bonusRateBps)
      expect(quote.baseCredits).toBe(amountEUR)
      expect(quote.amountMinor).toBe(amountEUR * 100)
      expect(quote.currency).toBe('EUR')
    },
  )

  it('uses round-half-up for €30 at 15%', () => {
    expect(quoteCreditTopUp(3_000).bonusCredits).toBe(5)
  })

  it.each([499, 550, 0, -100, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid amount %s',
    (amountMinor) => {
      expect(() => quoteCreditTopUp(amountMinor)).toThrow(TypeError)
    },
  )
})

describe('canonical direct Story pricing', () => {
  it('quotes every Story at exactly 130 EUR cents without wallet credits', () => {
    expect(quoteDirectStoryPurchase()).toEqual({
      amountMinor: 130,
      credits: 0,
      currency: 'EUR',
      pricingVersion: 'story-direct-eur-v1',
      purchaseType: 'individual_story',
    })
  })

  it('returns a fresh immutable-shaped quote on every call', () => {
    const first = quoteDirectStoryPurchase()
    const second = quoteDirectStoryPurchase()
    expect(first).not.toBe(second)
    expect(first.amountMinor).toBe(130)
  })
})
