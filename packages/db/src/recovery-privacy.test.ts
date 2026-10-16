import { describe, expect, it } from 'vitest'
import { assertRecoveryAccountRestrictions } from './recovery-privacy'

const restricted = {
  id: 'internal',
  subject: 'private-subject',
  state: 'pending_deletion',
  readingHistory: false,
  staffAccess: false,
}

describe('restore privacy gate', () => {
  it('accepts preserved restrictions and ignores ordinary active readers', () => {
    expect(() => {
      assertRecoveryAccountRestrictions(
        [restricted, { ...restricted, id: 'reader', state: 'active' }],
        [restricted],
      )
    }).not.toThrow()
  })
  it.each(
    [
      [],
      [{ ...restricted, state: 'active' }],
      [{ ...restricted, state: 'disabled' }],
      [{ ...restricted, subject: 'different' }],
      [{ ...restricted, readingHistory: true }],
      [{ ...restricted, staffAccess: true }],
    ].map((restored) => ({ restored })),
  )(
    'rejects unsafe recovery without exposing identity references: %j',
    ({ restored }) => {
      expect(() => {
        assertRecoveryAccountRestrictions([restricted], restored)
      }).toThrow(
        'Restored account privacy restrictions require operator review.',
      )
    },
  )
  it('preserves disabled-account access denial without erasing its history', () => {
    const disabled = { ...restricted, state: 'disabled', readingHistory: true }
    expect(() => {
      assertRecoveryAccountRestrictions([disabled], [disabled])
    }).not.toThrow()
  })
})
