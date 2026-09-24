import { describe, expect, it } from 'vitest'

import {
  CreditPackConfigurationError,
  findConfiguredCreditPack,
  parseCreditPackCatalog,
} from './credit-packs'

const catalog = JSON.stringify([
  { amountMinor: 500, credits: 5, currency: 'eur', packKey: 'five-credits' },
])

describe('credit-pack configuration', () => {
  it('normalizes a server-owned pack', () => {
    expect(findConfiguredCreditPack('five-credits', catalog)).toEqual({
      amountMinor: 500,
      credits: 5,
      currency: 'EUR',
      packKey: 'five-credits',
    })
  })

  it('returns null for an unknown configured key', () => {
    expect(findConfiguredCreditPack('other-pack', catalog)).toBeNull()
  })

  it.each([
    undefined,
    'not-json',
    '[]',
    JSON.stringify([
      { amountMinor: 0, credits: 1, currency: 'EUR', packKey: 'bad' },
    ]),
    JSON.stringify([
      { amountMinor: 100, credits: 1, currency: 'EUR', packKey: 'same' },
      { amountMinor: 200, credits: 2, currency: 'EUR', packKey: 'same' },
    ]),
  ])('fails closed for malformed or ambiguous configuration', (source) => {
    expect(() => parseCreditPackCatalog(source)).toThrow(
      CreditPackConfigurationError,
    )
  })
})
