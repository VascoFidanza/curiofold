import { describe, expect, it, vi } from 'vitest'

import type { AuthorizationContext } from '@curiofold/domain'

import { IdentitySessionError } from './identity'
import { resolveStoryPurchaseState } from './story-purchase-state'

const reader: AuthorizationContext = {
  accountState: 'active',
  emailVerified: true,
  firstFactorVerifiedAt: null,
  secondFactorVerifiedAt: null,
  staffRoles: new Set(),
  userId: 'reader-1',
}

describe('Story purchase state', () => {
  it('never queries ownership for anonymous visitors', async () => {
    const ownedSource = vi.fn()
    await expect(
      resolveStoryPurchaseState('story-1', 'en', {
        configured: true,
        authorizationSource: () =>
          Promise.reject(new IdentitySessionError('unauthenticated')),
        ownedSource,
      }),
    ).resolves.toEqual({ status: 'anonymous' })
    expect(ownedSource).not.toHaveBeenCalled()
  })

  it('treats ownership as authoritative regardless of balance', async () => {
    const balanceSource = vi.fn()
    await expect(
      resolveStoryPurchaseState('story-1', 'en', {
        configured: true,
        authorizationSource: () => Promise.resolve(reader),
        ownedSource: () => Promise.resolve('in_progress'),
        balanceSource,
      }),
    ).resolves.toEqual({ status: 'owned', readingState: 'in_progress' })
    expect(balanceSource).not.toHaveBeenCalled()
  })

  it('shows canonical balance and verified-email gate for unowned readers', async () => {
    await expect(
      resolveStoryPurchaseState('story-1', 'en', {
        configured: true,
        authorizationSource: () =>
          Promise.resolve({ ...reader, emailVerified: false }),
        ownedSource: () => Promise.resolve(null),
        balanceSource: () => Promise.resolve(3),
      }),
    ).resolves.toEqual({
      status: 'unowned',
      availableCredits: 3,
      canUnlock: false,
    })
  })

  it('does not imply ownership when identity is unavailable', async () => {
    await expect(
      resolveStoryPurchaseState('story-1', 'en', { configured: false }),
    ).resolves.toEqual({ status: 'unavailable' })
  })
})
