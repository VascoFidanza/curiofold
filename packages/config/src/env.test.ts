import { describe, expect, it } from 'vitest'

import { parsePublicEnvironment, parseServerEnvironment } from './env'

describe('environment contracts', () => {
  it('provides safe local defaults for public configuration', () => {
    expect(parsePublicEnvironment({})).toEqual({
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_ENVIRONMENT: 'local',
    })
  })

  it('rejects an incomplete server environment', () => {
    expect(() => parseServerEnvironment({})).toThrow()
  })

  it('accepts a complete server environment without exposing it as public config', () => {
    const environment = parseServerEnvironment({
      CLERK_SECRET_KEY: 'sk_test_clerk',
      DATABASE_URL: 'postgresql://localhost/curiofold',
      NEXT_PUBLIC_APP_URL: 'https://preview.example.com',
      NEXT_PUBLIC_ENVIRONMENT: 'preview',
      NODE_ENV: 'test',
      STRIPE_SECRET_KEY: 'sk_test_stripe',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    })

    expect(environment.STRIPE_SECRET_KEY).toBe('sk_test_stripe')
    expect(environment.NEXT_PUBLIC_ENVIRONMENT).toBe('preview')
  })
})
