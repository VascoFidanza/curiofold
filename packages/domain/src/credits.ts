export const creditGrantSources = [
  'correction',
  'payment',
  'promotional',
  'seed',
  'support',
] as const

export type CreditGrantSource = (typeof creditGrantSources)[number]

export interface WalletBalance {
  readonly availableCredits: number
  readonly version: number
}

export interface CreditGrantReceipt {
  readonly availableCredits: number
  readonly grantId: string
  readonly grantedCredits: number
  readonly source: CreditGrantSource
  readonly walletVersion: number
}

const maximumCreditUnitsPerGrant = 1_000_000
const maximumOperationKeyLength = 200

export function assertPositiveCreditUnits(units: number): void {
  if (
    !Number.isSafeInteger(units) ||
    units <= 0 ||
    units > maximumCreditUnitsPerGrant
  ) {
    throw new TypeError(
      `Credit grants must be positive integers no greater than ${String(maximumCreditUnitsPerGrant)}.`,
    )
  }
}

export function normalizeCreditOperationKey(operationKey: string): string {
  const normalized = operationKey.trim()
  const containsControlCharacter = Array.from(normalized).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 31 || codePoint === 127
  })
  if (
    !normalized ||
    normalized.length > maximumOperationKeyLength ||
    containsControlCharacter
  ) {
    throw new TypeError(
      `Credit operation keys must contain 1–${String(maximumOperationKeyLength)} visible characters.`,
    )
  }
  return normalized
}
