import { describe, expect, it, vi } from 'vitest'

import type { AuthorizationContext } from '@curiofold/domain'
import {
  InsufficientCreditsError,
  StoryUnlockUnavailableError,
  UnlockOperationConflictError,
} from '@curiofold/db'

import { IdentitySessionError } from './identity'
import { createStoryUnlockResponse } from './story-unlock-route'

const storyId = '11111111-1111-4111-8111-111111111111'
const authorization: AuthorizationContext = {
  accountState: 'active',
  emailVerified: true,
  firstFactorVerifiedAt: null,
  secondFactorVerifiedAt: null,
  staffRoles: new Set(),
  userId: 'internal-user',
}

function request(
  body: unknown = { storyId },
  operationKey = 'unlock:browser-operation-1',
): Request {
  return new Request('https://curiofold.test/api/v1/story-unlocks', {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': operationKey,
    },
    method: 'POST',
  })
}

describe('Story unlock route', () => {
  it('rejects a cross-origin mutation before authentication', async () => {
    const authorizationSource = vi.fn()
    const unlockSource = vi.fn()
    const crossOrigin = request()
    crossOrigin.headers.set('Origin', 'https://attacker.example')
    crossOrigin.headers.set('Sec-Fetch-Site', 'cross-site')

    const response = await createStoryUnlockResponse(
      crossOrigin,
      'request-cross-origin',
      { authorizationSource, unlockSource },
    )

    expect(response.status).toBe(403)
    expect(authorizationSource).not.toHaveBeenCalled()
    expect(unlockSource).not.toHaveBeenCalled()
  })

  it('requires a valid idempotency key before authentication', async () => {
    const authorizationSource = vi.fn()
    const response = await createStoryUnlockResponse(
      request({ storyId }, ''),
      'request-no-key',
      { authorizationSource },
    )

    expect(response.status).toBe(400)
    expect(authorizationSource).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      code: 'invalid_idempotency_key',
    })
  })

  it('requires authentication and verified email', async () => {
    const unauthenticated = await createStoryUnlockResponse(
      request(),
      'request-unauthenticated',
      {
        authorizationSource: () =>
          Promise.reject(new IdentitySessionError('unauthenticated')),
      },
    )
    expect(unauthenticated.status).toBe(401)

    const unverified = await createStoryUnlockResponse(
      request(),
      'request-unverified',
      {
        authorizationSource: () =>
          Promise.resolve({ ...authorization, emailVerified: false }),
      },
    )
    expect(unverified.status).toBe(403)
    await expect(unverified.json()).resolves.toMatchObject({
      code: 'email_verification_required',
    })
  })

  it.each([
    [{}, 'unlock:valid'],
    [{ storyId, unexpected: true }, 'unlock:valid'],
    [{ storyId: 'not-a-uuid' }, 'unlock:valid'],
  ])('rejects an invalid unlock payload', async (body, operationKey) => {
    const unlockSource = vi.fn()
    const response = await createStoryUnlockResponse(
      request(body, operationKey),
      'request-invalid',
      {
        authorizationSource: () => Promise.resolve(authorization),
        unlockSource,
      },
    )

    expect(response.status).toBe(400)
    expect(unlockSource).not.toHaveBeenCalled()
  })

  it('returns a canonical unlocked result without exposing ledger internals', async () => {
    const unlockSource = vi.fn().mockResolvedValue({
      availableCredits: 4,
      entitlementId: '22222222-2222-4222-8222-222222222222',
      operationId: '33333333-3333-4333-8333-333333333333',
      outcome: 'unlocked',
      walletEntryId: '44444444-4444-4444-8444-444444444444',
      walletVersion: 2,
    })
    const response = await createStoryUnlockResponse(
      request(),
      'request-unlocked',
      {
        authorizationSource: () => Promise.resolve(authorization),
        unlockSource,
      },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(unlockSource).toHaveBeenCalledWith({
      operationKey: 'unlock:browser-operation-1',
      storyId,
      userId: 'internal-user',
    })
    await expect(response.json()).resolves.toEqual({
      balance: { availableCredits: 4, version: 2 },
      entitlementId: '22222222-2222-4222-8222-222222222222',
      operationId: '33333333-3333-4333-8333-333333333333',
      outcome: 'unlocked',
    })
  })

  it.each([
    [new InsufficientCreditsError(), 409, 'insufficient_credits'],
    [new StoryUnlockUnavailableError(), 404, 'not_found'],
    [new UnlockOperationConflictError(), 409, 'idempotency_conflict'],
  ])('maps an expected domain refusal', async (error, status, code) => {
    const response = await createStoryUnlockResponse(
      request(),
      'request-refused',
      {
        authorizationSource: () => Promise.resolve(authorization),
        unlockSource: () => Promise.reject(error),
      },
    )

    expect(response.status).toBe(status)
    await expect(response.json()).resolves.toMatchObject({ code })
  })
})
