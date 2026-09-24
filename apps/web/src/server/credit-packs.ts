import {
  normalizeCreditPackSnapshot,
  type CreditPackSnapshot,
} from '@curiofold/domain'

export class CreditPackConfigurationError extends Error {
  override readonly name = 'CreditPackConfigurationError'
}

function parseCreditPack(value: unknown): CreditPackSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CreditPackConfigurationError(
      'Credit-pack configuration is invalid.',
    )
  }

  const candidate = value as Record<string, unknown>
  if (
    Object.keys(candidate).some(
      (key) => !['amountMinor', 'credits', 'currency', 'packKey'].includes(key),
    ) ||
    typeof candidate.amountMinor !== 'number' ||
    typeof candidate.credits !== 'number' ||
    typeof candidate.currency !== 'string' ||
    typeof candidate.packKey !== 'string'
  ) {
    throw new CreditPackConfigurationError(
      'Credit-pack configuration is invalid.',
    )
  }

  try {
    return normalizeCreditPackSnapshot({
      amountMinor: candidate.amountMinor,
      credits: candidate.credits,
      currency: candidate.currency,
      packKey: candidate.packKey,
    })
  } catch {
    throw new CreditPackConfigurationError(
      'Credit-pack configuration is invalid.',
    )
  }
}

export function parseCreditPackCatalog(
  source: string | undefined,
): ReadonlyMap<string, CreditPackSnapshot> {
  if (!source) {
    throw new CreditPackConfigurationError('Credit packs are not configured.')
  }

  let value: unknown
  try {
    value = JSON.parse(source) as unknown
  } catch {
    throw new CreditPackConfigurationError(
      'Credit-pack configuration is invalid JSON.',
    )
  }

  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    throw new CreditPackConfigurationError(
      'Credit-pack configuration must be a non-empty array.',
    )
  }

  const catalog = new Map<string, CreditPackSnapshot>()
  for (const item of value) {
    const pack = parseCreditPack(item)
    if (catalog.has(pack.packKey)) {
      throw new CreditPackConfigurationError('Credit-pack keys must be unique.')
    }
    catalog.set(pack.packKey, pack)
  }
  return catalog
}

export function findConfiguredCreditPack(
  packKey: string,
  source: string | undefined = process.env.CREDIT_PACKS_JSON,
): CreditPackSnapshot | null {
  return parseCreditPackCatalog(source).get(packKey) ?? null
}
