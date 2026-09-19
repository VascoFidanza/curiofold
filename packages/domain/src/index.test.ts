import { describe, expect, it } from 'vitest'

import { fail, succeed } from './index'

describe('Result', () => {
  it('represents successful values without throwing', () => {
    expect(succeed('story')).toEqual({ ok: true, value: 'story' })
  })

  it('represents expected failures without throwing', () => {
    expect(fail('unavailable')).toEqual({ error: 'unavailable', ok: false })
  })
})
