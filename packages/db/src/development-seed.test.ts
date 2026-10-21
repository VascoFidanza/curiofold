import { describe, expect, it } from 'vitest'

import { assertNonProductionSeedEnvironment } from './development-seed'

describe('assertNonProductionSeedEnvironment', () => {
  it.each(['local', 'test', 'preview', 'staging'])(
    'rejects a production deployment mislabeled as %s',
    (environment) => {
      expect(() => {
        assertNonProductionSeedEnvironment(
          environment,
          'nonproduction',
          'production',
        )
      }).toThrow(/non-production/u)
    },
  )
  it.each(['preview', 'development', undefined])(
    'preserves allowed operation on platform %s',
    (deploymentEnvironment) => {
      expect(() => {
        assertNonProductionSeedEnvironment(
          'preview',
          'nonproduction',
          deploymentEnvironment,
        )
      }).not.toThrow()
    },
  )
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
