import { describe, expect, it } from 'vitest'

import { can, safeReturnPath, type AuthorizationContext } from './identity'

const now = new Date('2026-09-20T12:00:00.000Z')

function context(
  overrides: Partial<AuthorizationContext> = {},
): AuthorizationContext {
  return {
    accountState: 'active',
    emailVerified: true,
    firstFactorVerifiedAt: new Date('2026-09-20T11:55:00.000Z'),
    secondFactorVerifiedAt: new Date('2026-09-20T11:55:00.000Z'),
    staffRoles: new Set(),
    userId: 'user-1',
    ...overrides,
  }
}

describe('authorization policy', () => {
  it('allows active consumers while requiring verified email for money-sensitive entry points', () => {
    expect(can(context({ emailVerified: false }), 'account.read', now)).toBe(
      true,
    )
    expect(can(context({ emailVerified: false }), 'story.unlock', now)).toBe(
      false,
    )
    expect(can(context(), 'story.unlock', now)).toBe(true)
  })

  it('denies every capability for a disabled account', () => {
    const disabled = context({
      accountState: 'disabled',
      staffRoles: new Set(['admin']),
    })

    expect(can(disabled, 'account.read', now)).toBe(false)
    expect(can(disabled, 'role.manage', now)).toBe(false)
  })

  it('keeps privileged capabilities deny-by-default and role-specific', () => {
    expect(can(context(), 'story.publish', now)).toBe(false)
    expect(
      can(
        context({ staffRoles: new Set(['publisher']) }),
        'story.publish',
        now,
      ),
    ).toBe(true)
    expect(
      can(context({ staffRoles: new Set(['support']) }), 'story.publish', now),
    ).toBe(false)
  })

  it('requires recent first- and second-factor verification for staff actions', () => {
    const stale = new Date('2026-09-20T11:30:00.000Z')
    const publisher = context({
      secondFactorVerifiedAt: stale,
      staffRoles: new Set(['publisher']),
    })

    expect(can(publisher, 'story.publish', now)).toBe(false)
  })
})

describe('safe return paths', () => {
  it('preserves only allowlisted local product destinations', () => {
    expect(
      safeReturnPath('/en/stories/clockwork-gardens?from=unlock#ignored'),
    ).toBe('/en/stories/clockwork-gardens?from=unlock')
    expect(safeReturnPath('/pt-PT/stories/jardins-de-relogio/read')).toBe(
      '/pt-PT/stories/jardins-de-relogio/read',
    )
    expect(safeReturnPath('/library')).toBe('/library')
    expect(safeReturnPath('/credits?return=%2Faccount')).toBe(
      '/credits?return=%2Faccount',
    )
  })

  it.each([
    'https://attacker.example/path',
    '//attacker.example/path',
    '/\\attacker.example/path',
    '/sign-in?redirect_url=https://attacker.example',
    '/unknown',
    'javascript:alert(1)',
  ])('rejects unsafe or unapproved destination %s', (candidate) => {
    expect(safeReturnPath(candidate)).toBe('/')
  })
})
