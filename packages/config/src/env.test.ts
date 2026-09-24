import { describe, expect, it } from 'vitest'

import {
  parseIdentityEnvironment,
  parsePublicEnvironment,
  parseServerEnvironment,
} from './env'

describe('environment contracts', () => {
  it('provides safe local defaults for public configuration', () => {
    expect(parsePublicEnvironment({})).toEqual({
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_ENVIRONMENT: 'local',
    })
  })

  it('rejects an incomplete server environment', () => {
    expect(() => parseServerEnvironment({})).toThrow()
    expect(() =>
      parseIdentityEnvironment({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_partial',
      }),
    ).toThrow()
  })

  it('accepts only a complete identity provider contract', () => {
    expect(
      parseIdentityEnvironment({
        CLERK_SECRET_KEY: 'sk_test_clerk',
        CLERK_WEBHOOK_SIGNING_SECRET: 'whsec_test_clerk',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_clerk',
      }),
    ).toEqual({
      CLERK_SECRET_KEY: 'sk_test_clerk',
      CLERK_WEBHOOK_SIGNING_SECRET: 'whsec_test_clerk',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_clerk',
    })
  })

  it('accepts a complete server environment without exposing it as public config', () => {
    const environment = parseServerEnvironment({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_clerk',
      CLERK_SECRET_KEY: 'sk_test_clerk',
      CLERK_WEBHOOK_SIGNING_SECRET: 'whsec_test_clerk',
      CREDIT_PACKS_JSON:
        '[{"packKey":"test-pack","credits":1,"amountMinor":100,"currency":"EUR"}]',
      DATABASE_URL: 'postgresql://localhost/curiofold',
      NEXT_PUBLIC_APP_URL: 'https://preview.example.com',
      NEXT_PUBLIC_ENVIRONMENT: 'preview',
      NODE_ENV: 'test',
      STRIPE_SECRET_KEY: 'sk_test_stripe',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    })

    expect(environment.STRIPE_SECRET_KEY).toBe('sk_test_stripe')
    expect(environment.CREDIT_PACKS_JSON).toContain('test-pack')
    expect(environment.NEXT_PUBLIC_ENVIRONMENT).toBe('preview')
  })
})
