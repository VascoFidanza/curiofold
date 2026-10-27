import { describe, expect, it } from 'vitest'
import { identityKeysMatchEnvironment } from './identity'
import { parseIdentityEnvironment, parseServerEnvironment } from './env'

const keys = (mode: 'live' | 'test') => ({
  CLERK_SECRET_KEY: `sk_${mode}_fixture_not_a_secret`,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_${mode}_fixture_not_a_key`,
})

describe('identity environment isolation', () => {
  it.each(['local', 'test', 'preview', 'staging', undefined])(
    'preserves development keys in %s and rejects live keys',
    (environment) => {
      expect(
        identityKeysMatchEnvironment({
          ...keys('test'),
          NEXT_PUBLIC_ENVIRONMENT: environment,
        }),
      ).toBe(true)
      expect(
        identityKeysMatchEnvironment({
          ...keys('live'),
          NEXT_PUBLIC_ENVIRONMENT: environment,
        }),
      ).toBe(false)
    },
  )
  it.each(['local', 'test', 'preview', 'staging', undefined])(
    'refuses production deployments mislabeled as %s',
    (environment) => {
      for (const mode of ['test', 'live'] as const)
        expect(
          identityKeysMatchEnvironment({
            ...keys(mode),
            VERCEL_ENV: 'production',
            NEXT_PUBLIC_ENVIRONMENT: environment,
          }),
        ).toBe(false)
    },
  )
  it.each(['preview', 'development'])(
    'refuses production identity on Vercel %s',
    (deployment) => {
      expect(
        identityKeysMatchEnvironment({
          ...keys('live'),
          VERCEL_ENV: deployment,
          NEXT_PUBLIC_ENVIRONMENT: 'production',
        }),
      ).toBe(false)
    },
  )
  it.each(['production', undefined])(
    'allows live keys in explicit production on %s',
    (deployment) => {
      expect(
        identityKeysMatchEnvironment({
          ...keys('live'),
          NEXT_PUBLIC_ENVIRONMENT: 'production',
          VERCEL_ENV: deployment,
        }),
      ).toBe(true)
      expect(
        identityKeysMatchEnvironment({
          ...keys('test'),
          NEXT_PUBLIC_ENVIRONMENT: 'production',
          VERCEL_ENV: deployment,
        }),
      ).toBe(false)
    },
  )
  it.each([
    {},
    { ...keys('test'), CLERK_SECRET_KEY: '' },
    { ...keys('test'), CLERK_SECRET_KEY: 'sk_test_' },
    { ...keys('test'), CLERK_SECRET_KEY: 'sk_live_fixture' },
    { ...keys('test'), NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_fixture' },
    { ...keys('test'), CLERK_SECRET_KEY: 'sk_test_fixture\n' },
    { ...keys('test'), NEXT_PUBLIC_ENVIRONMENT: 'unknown' },
  ])('fails closed on incomplete/mismatched/invalid input %#', (source) => {
    expect(identityKeysMatchEnvironment(source)).toBe(false)
  })
  it('enforces the same mode boundary in both server parsers without leaking input', () => {
    const source = {
      ...keys('test'),
      NEXT_PUBLIC_ENVIRONMENT: 'production',
      CLERK_WEBHOOK_SIGNING_SECRET: 'whsec_fixture',
    }
    for (const parse of [parseIdentityEnvironment, parseServerEnvironment])
      expect(() => parse(source)).toThrow(
        /^Identity configuration is unavailable for this environment\.$/u,
      )
  })
})
