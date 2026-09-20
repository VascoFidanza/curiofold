import { describe, expect, it } from 'vitest'

import type { AuthorizationContext } from '@curiofold/domain'

import { IdentitySessionError } from './identity'
import { createSessionResponse } from './session-route'

const context: AuthorizationContext = {
  accountState: 'active',
  emailVerified: false,
  firstFactorVerifiedAt: null,
  secondFactorVerifiedAt: null,
  staffRoles: new Set(),
  userId: 'internal-user',
}

describe('session resource', () => {
  it('returns a no-store capability projection without exposing internal identity', async () => {
    const response = await createSessionResponse(() => Promise.resolve(context))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      emailVerified: false,
      permissions: {
        canCreateCheckout: false,
        canReadOwnedStory: true,
        canUnlockStory: false,
      },
    })
  })

  it.each([
    ['unauthenticated', 401, 'Authentication required'],
    ['account_disabled', 403, 'Account access disabled'],
    ['identity_unavailable', 503, 'Identity service unavailable'],
  ] as const)(
    'maps %s to a stable problem response',
    async (code, status, title) => {
      const response = await createSessionResponse(() =>
        Promise.reject(new IdentitySessionError(code)),
      )

      expect(response.status).toBe(status)
      expect(response.headers.get('content-type')).toContain(
        'application/problem+json',
      )
      await expect(response.json()).resolves.toMatchObject({
        code,
        status,
        title,
      })
    },
  )
})
