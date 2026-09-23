import { describe, expect, it, vi } from 'vitest'

import type { AuthorizationContext } from '@curiofold/domain'
import { InvalidWalletHistoryCursorError } from '@curiofold/db'

import { IdentitySessionError } from './identity'
import { createWalletResponse } from './wallet-route'

const authorization: AuthorizationContext = {
  accountState: 'active',
  emailVerified: true,
  firstFactorVerifiedAt: null,
  secondFactorVerifiedAt: null,
  staffRoles: new Set(),
  userId: 'internal-user',
}

function request(query = ''): Request {
  return new Request(`https://curiofold.test/api/v1/wallet${query}`)
}

describe('wallet route', () => {
  it('requires an authenticated active account', async () => {
    const unauthenticated = await createWalletResponse(
      request(),
      'request-unauthenticated',
      {
        authorizationSource: () =>
          Promise.reject(new IdentitySessionError('unauthenticated')),
      },
    )
    expect(unauthenticated.status).toBe(401)
    expect(unauthenticated.headers.get('cache-control')).toBe('no-store')

    const disabled = await createWalletResponse(request(), 'request-disabled', {
      authorizationSource: () =>
        Promise.reject(new IdentitySessionError('account_disabled')),
    })
    expect(disabled.status).toBe(403)
  })

  it('returns a retryable identity-provider failure', async () => {
    const response = await createWalletResponse(
      request(),
      'request-unavailable',
      {
        authorizationSource: () =>
          Promise.reject(new IdentitySessionError('identity_unavailable')),
      },
    )

    expect(response.status).toBe(503)
    expect(response.headers.get('retry-after')).toBe('60')
  })

  it.each([
    '?limit=0',
    '?limit=101',
    '?limit=1.5',
    '?cursor=',
    '?cursor=one&cursor=two',
    '?unknown=value',
  ])('rejects an invalid wallet query: %s', async (query) => {
    const historySource = vi.fn()
    const response = await createWalletResponse(
      request(query),
      'request-invalid',
      {
        authorizationSource: () => Promise.resolve(authorization),
        historySource,
      },
    )

    expect(response.status).toBe(400)
    expect(historySource).not.toHaveBeenCalled()
  })

  it('returns only the customer-safe wallet projection', async () => {
    const occurredAt = new Date('2026-09-23T14:00:00.000Z')
    const historySource = vi.fn().mockResolvedValue({
      balance: { availableCredits: 4, version: 2 },
      nextCursor: 'opaque-cursor',
      transactions: [
        {
          credits: -1,
          id: '11111111-1111-4111-8111-111111111111',
          kind: 'story_unlocked',
          occurredAt,
          storyId: '22222222-2222-4222-8222-222222222222',
        },
      ],
    })

    const response = await createWalletResponse(
      request('?limit=25&cursor=opaque-cursor'),
      'request-wallet',
      {
        authorizationSource: () => Promise.resolve(authorization),
        historySource,
      },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(historySource).toHaveBeenCalledWith('internal-user', {
      cursor: 'opaque-cursor',
      limit: 25,
    })
    await expect(response.json()).resolves.toEqual({
      balance: { availableCredits: 4, version: 2 },
      nextCursor: 'opaque-cursor',
      transactions: [
        {
          credits: -1,
          id: '11111111-1111-4111-8111-111111111111',
          kind: 'story_unlocked',
          occurredAt: occurredAt.toISOString(),
          storyId: '22222222-2222-4222-8222-222222222222',
        },
      ],
    })
  })

  it('maps an invalid opaque cursor without exposing parser details', async () => {
    const response = await createWalletResponse(
      request('?cursor=syntactically-valid-but-opaque'),
      'request-cursor',
      {
        authorizationSource: () => Promise.resolve(authorization),
        historySource: () =>
          Promise.reject(new InvalidWalletHistoryCursorError()),
      },
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'invalid_wallet_cursor',
      requestId: 'request-cursor',
    })
  })
})
