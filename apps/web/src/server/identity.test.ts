import { describe, expect, it, vi } from 'vitest'

import { ensureIdentityAccount } from '@curiofold/db'

import type { IdentitySessionError } from './identity'
import {
  isClerkSessionConfigured,
  requireAuthorizationContext,
} from './identity'

vi.mock('@curiofold/db', () => ({
  ensureIdentityAccount: vi.fn(),
}))

const mockedEnsureIdentityAccount = vi.mocked(ensureIdentityAccount)

describe('identity session boundary', () => {
  it('distinguishes an unavailable provider from an anonymous session', async () => {
    expect(isClerkSessionConfigured({})).toBe(false)
    expect(
      isClerkSessionConfigured({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_partial',
      }),
    ).toBe(false)
    expect(
      isClerkSessionConfigured({
        CLERK_SECRET_KEY: 'sk_test_complete',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_complete',
      }),
    ).toBe(true)

    await expect(
      requireAuthorizationContext({
        authSource: () =>
          Promise.resolve({
            factorVerificationAge: null,
            sessionId: null,
            userId: null,
          }),
      }),
    ).rejects.toMatchObject<Partial<IdentitySessionError>>({
      code: 'unauthenticated',
    })
  })

  it('links the provider subject and derives factor-verification timestamps', async () => {
    mockedEnsureIdentityAccount.mockResolvedValueOnce({
      accountState: 'active',
      emailVerified: true,
      staffRoles: new Set(['publisher']),
      userId: 'internal-user',
    })

    const result = await requireAuthorizationContext({
      authSource: () =>
        Promise.resolve({
          factorVerificationAge: [3, 7],
          sessionId: 'session_fixture',
          userId: 'user_clerk_fixture',
        }),
      clock: () => new Date('2026-09-20T12:00:00.000Z'),
      database: {} as never,
    })

    expect(mockedEnsureIdentityAccount).toHaveBeenCalledWith(
      {},
      'user_clerk_fixture',
      new Date('2026-09-20T12:00:00.000Z'),
    )
    expect(result).toMatchObject({
      emailVerified: true,
      firstFactorVerifiedAt: new Date('2026-09-20T11:57:00.000Z'),
      secondFactorVerifiedAt: new Date('2026-09-20T11:53:00.000Z'),
      staffRoles: new Set(['publisher']),
      userId: 'internal-user',
    })
  })

  it('denies a valid provider session when the internal account is disabled', async () => {
    mockedEnsureIdentityAccount.mockResolvedValueOnce({
      accountState: 'disabled',
      emailVerified: false,
      staffRoles: new Set(),
      userId: 'internal-user',
    })

    await expect(
      requireAuthorizationContext({
        authSource: () =>
          Promise.resolve({
            factorVerificationAge: [0, 0],
            sessionId: 'session_fixture',
            userId: 'user_clerk_fixture',
          }),
        database: {} as never,
      }),
    ).rejects.toMatchObject<Partial<IdentitySessionError>>({
      code: 'account_disabled',
    })
  })
})
