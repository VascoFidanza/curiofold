import { describe, expect, it, vi } from 'vitest'

import type { AuthorizationContext } from '@curiofold/domain'

import { IdentitySessionError } from './identity'
import { resolveReaderAccess } from './reader-access'

const activeReader: AuthorizationContext = {
  accountState: 'active',
  emailVerified: false,
  firstFactorVerifiedAt: null,
  secondFactorVerifiedAt: null,
  staffRoles: new Set(),
  userId: 'internal-user',
}

describe('Reader access boundary', () => {
  it.each([
    'identity_unavailable',
    'unauthenticated',
    'account_disabled',
  ] as const)(
    'fails before content lookup for %s identity state',
    async (code) => {
      const storySource = vi.fn()

      await expect(
        resolveReaderAccess('en', 'clockwork-gardens', {
          authorizationSource: () =>
            Promise.reject(new IdentitySessionError(code)),
          storySource,
        }),
      ).resolves.toEqual({ status: code })
      expect(storySource).not.toHaveBeenCalled()
    },
  )

  it('denies an active user without an entitlement result', async () => {
    const storySource = vi.fn().mockResolvedValue({ status: 'not_entitled' })

    await expect(
      resolveReaderAccess('en', 'clockwork-gardens', {
        authorizationSource: () => Promise.resolve(activeReader),
        storySource,
      }),
    ).resolves.toEqual({ status: 'not_entitled' })
    expect(storySource).toHaveBeenCalledWith(
      'internal-user',
      'en',
      'clockwork-gardens',
    )
  })

  it('does not treat a privileged role as Story ownership', async () => {
    const storySource = vi.fn().mockResolvedValue({ status: 'not_entitled' })

    await expect(
      resolveReaderAccess('en', 'clockwork-gardens', {
        authorizationSource: () =>
          Promise.resolve({
            ...activeReader,
            emailVerified: true,
            staffRoles: new Set(['admin']),
          }),
        storySource,
      }),
    ).resolves.toEqual({ status: 'not_entitled' })
  })
})
