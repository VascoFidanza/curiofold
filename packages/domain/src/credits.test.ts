import { describe, expect, it } from 'vitest'

import {
  assertPositiveCreditUnits,
  normalizeCreditOperationKey,
} from './credits'

describe('credit grant input policy', () => {
  it.each([1, 5, 1_000_000])('accepts positive integer units: %s', (units) => {
    expect(() => {
      assertPositiveCreditUnits(units)
    }).not.toThrow()
  })

  it.each([0, -1, 1.5, Number.NaN, 1_000_001])(
    'rejects invalid grant units: %s',
    (units) => {
      expect(() => {
        assertPositiveCreditUnits(units)
      }).toThrow(TypeError)
    },
  )

  it('normalizes a namespaced idempotency key', () => {
    expect(normalizeCreditOperationKey(' payment:order-123 ')).toBe(
      'payment:order-123',
    )
  })

  it.each(['', '   ', 'support:\nunsafe', 'x'.repeat(201)])(
    'rejects an unsafe operation key',
    (operationKey) => {
      expect(() => normalizeCreditOperationKey(operationKey)).toThrow(TypeError)
    },
  )
})
