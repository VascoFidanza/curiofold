import { describe, expect, it } from 'vitest'

import { assertNonProductionSeedEnvironment } from './development-seed'

describe('assertNonProductionSeedEnvironment', () => {
  it.each(['local', 'test', 'preview', 'staging'])(
    'permits the explicit %s non-production environment',
    (environment) => {
      expect(() => {
        assertNonProductionSeedEnvironment(environment, 'nonproduction')
      }).not.toThrow()
    },
  )

  it.each([
    ['production', 'nonproduction'],
    [undefined, 'nonproduction'],
    ['preview', undefined],
    ['preview', 'production'],
  ])('rejects unsafe seed input %#', (environment, confirmation) => {
    expect(() => {
      assertNonProductionSeedEnvironment(environment, confirmation)
    }).toThrow(/non-production/u)
  })
})
