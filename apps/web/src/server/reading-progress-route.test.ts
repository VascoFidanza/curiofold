import { describe, expect, it, vi } from 'vitest'

import type { AuthorizationContext } from '@curiofold/domain'

import { IdentitySessionError } from './identity'
import { createReadingProgressResponse } from './reading-progress-route'

const storyId = '11111111-1111-4111-8111-111111111111'
const versionId = '22222222-2222-4222-8222-222222222222'
const authorization: AuthorizationContext = {
  accountState: 'active',
  emailVerified: false,
  firstFactorVerifiedAt: null,
  secondFactorVerifiedAt: null,
  staffRoles: new Set(),
  userId: 'internal-user',
}
const payload = {
  clientSequence: 4,
  endMarkerReached: false,
  resumeBlockId: 'opening',
  resumeOffset: 8,
  versionId,
}

function request(body: unknown, contentType = 'application/json'): Request {
  return new Request(
    `https://curiofold.test/api/v1/reading-progress/${storyId}/en`,
    {
      body: JSON.stringify(body),
      headers: { 'Content-Type': contentType },
      method: 'PUT',
    },
  )
}

describe('reading progress route', () => {
  it('authenticates before accepting progress', async () => {
    const progressSource = vi.fn()
    const response = await createReadingProgressResponse(
      request(payload),
      { locale: 'en', storyId },
      'request-unauthenticated',
      {
        authorizationSource: () =>
          Promise.reject(new IdentitySessionError('unauthenticated')),
        progressSource,
      },
    )

    expect(response.status).toBe(401)
    expect(progressSource).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      code: 'unauthenticated',
      requestId: 'request-unauthenticated',
    })
  })

  it('rejects a cross-origin mutation before authentication or persistence', async () => {
    const authorizationSource = vi.fn()
    const progressSource = vi.fn()
    const crossOriginRequest = request(payload)
    crossOriginRequest.headers.set('Origin', 'https://attacker.example')
    crossOriginRequest.headers.set('Sec-Fetch-Site', 'cross-site')

    const response = await createReadingProgressResponse(
      crossOriginRequest,
      { locale: 'en', storyId },
      'request-cross-origin',
      { authorizationSource, progressSource },
    )

    expect(response.status).toBe(403)
    expect(authorizationSource).not.toHaveBeenCalled()
    expect(progressSource).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      code: 'cross_origin',
    })
  })

  it.each([
    [{ ...payload, unexpected: true }, 'application/json'],
    [{ ...payload, clientSequence: 0 }, 'application/json'],
    [{ ...payload, resumeBlockId: '<script>' }, 'application/json'],
    [payload, 'text/plain'],
  ])('rejects an invalid progress request', async (body, contentType) => {
    const progressSource = vi.fn()
    const response = await createReadingProgressResponse(
      request(body, contentType),
      { locale: 'en', storyId },
      'request-invalid',
      {
        authorizationSource: () => Promise.resolve(authorization),
        progressSource,
      },
    )

    expect(response.status).toBe(400)
    expect(progressSource).not.toHaveBeenCalled()
  })

  it('persists a validated user-scoped update', async () => {
    const progressSource = vi.fn().mockResolvedValue({
      accepted: true,
      progress: {
        completedAt: null,
        highWaterPercent: 42,
        lastClientSequence: 4,
        resumeBlockId: 'opening',
        resumeOffset: 8,
        storyId,
        versionId,
      },
      status: 'found',
    })
    const response = await createReadingProgressResponse(
      request(payload),
      { locale: 'en', storyId },
      'request-saved',
      {
        authorizationSource: () => Promise.resolve(authorization),
        progressSource,
      },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(progressSource).toHaveBeenCalledWith({
      ...payload,
      locale: 'en',
      storyId,
      userId: 'internal-user',
    })
    await expect(response.json()).resolves.toMatchObject({
      accepted: true,
      progress: { highWaterPercent: 42 },
    })
  })

  it('does not disclose whether an unowned Story exists', async () => {
    const response = await createReadingProgressResponse(
      request(payload),
      { locale: 'en', storyId },
      'request-hidden',
      {
        authorizationSource: () => Promise.resolve(authorization),
        progressSource: () => Promise.resolve({ status: 'not_entitled' }),
      },
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ code: 'not_found' })
  })
})
