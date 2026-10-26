import { describe, expect, it } from 'vitest'

import { migrationConnection } from './migrations'

describe('migration connection boundary', () => {
  it('preserves the existing explicit local direct URL', () => {
    const url = 'postgresql://curiofold:secret@127.0.0.1:5432/curiofold'
    expect(migrationConnection({ DATABASE_URL: url })).toBe(url)
  })

  it.each([
    undefined,
    '',
    'not-a-url',
    'https://example.com/database',
    'postgresql://localhost',
    'postgresql://user:secret@ep-example-pooler.eu-central-1.aws.neon.tech/db',
  ])(
    'rejects invalid or pooled configuration %# without exposing it',
    (url) => {
      expect(() => migrationConnection({ DATABASE_URL: url })).toThrow(
        /^migration_configuration_invalid$/u,
      )
    },
  )

  it.each(['VERCEL_ENV', 'NEXT_PUBLIC_ENVIRONMENT'])(
    'refuses production context through %s before opening a connection',
    (key) => {
      expect(() =>
        migrationConnection({
          DATABASE_URL: 'postgresql://user:secret@localhost/db',
          [key]: 'production',
        }),
      ).toThrow(/^migration_configuration_invalid$/u)
    },
  )
})
