export const pricingVersion = 'top-up-eur-v1'
export const minimumTopUpAmountMinor = 500
export const directStoryPriceMinor = 130
export const directStoryPricingVersion = 'story-direct-eur-v1'

const maximumSafeMinorAmount = Number.MAX_SAFE_INTEGER

export type CreditTopUpQuote = Readonly<{
  amountEUR: number
  amountMinor: number
  baseCredits: number
  bonusCredits: number
  bonusRateBps: number
  currency: 'EUR'
  pricingVersion: string
  totalCredits: number
}>

export type DirectStoryPurchaseQuote = Readonly<{
  amountMinor: 130
  credits: 0
  currency: 'EUR'
  pricingVersion: typeof directStoryPricingVersion
  purchaseType: 'individual_story'
}>

/** Returns the server-owned, non-wallet price for every direct Story purchase. */
export function quoteDirectStoryPurchase(): DirectStoryPurchaseQuote {
  return {
    amountMinor: directStoryPriceMinor,
    credits: 0,
    currency: 'EUR',
    pricingVersion: directStoryPricingVersion,
    purchaseType: 'individual_story',
  }
}

function bonusRateForAmount(amountEUR: number): number {
  if (amountEUR >= 100) return 1_800
  if (amountEUR >= 50) return 1_700
  if (amountEUR >= 20) return 1_500
  if (amountEUR >= 10) return 1_000
  return 0
}

/**
 * Quotes the canonical Curiofold EUR top-up using integer arithmetic.
 * Bonus credits use deterministic round-half-up: floor((base * bps + 5000) / 10000).
 */
export function quoteCreditTopUp(amountMinor: number): CreditTopUpQuote {
  if (
    !Number.isSafeInteger(amountMinor) ||
    amountMinor < minimumTopUpAmountMinor ||
    amountMinor % 100 !== 0 ||
    amountMinor > maximumSafeMinorAmount
  ) {
    throw new TypeError('Top-ups must be whole EUR amounts of at least €5.')
  }

  const amountEUR = amountMinor / 100
  const bonusRateBps = bonusRateForAmount(amountEUR)
  const bonusCredits = Math.floor((amountEUR * bonusRateBps + 5_000) / 10_000)
  const baseCredits = amountEUR

  return {
    amountEUR,
    amountMinor,
    baseCredits,
    bonusCredits,
    bonusRateBps,
    currency: 'EUR',
    pricingVersion,
    totalCredits: baseCredits + bonusCredits,
  }
}
