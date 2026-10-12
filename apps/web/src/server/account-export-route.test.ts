import { describe, expect, it, vi } from 'vitest'
import type { AuthorizationContext } from '@curiofold/domain'

import { createAccountExportResponse } from './account-export-route'
import { IdentitySessionError } from './identity'

const authorization: AuthorizationContext = {
  accountState: 'active',
  emailVerified: true,
  userId: 'session-owner',
  firstFactorVerifiedAt: null,
  secondFactorVerifiedAt: null,
  staffRoles: new Set(),
}
const request = (query = '') =>
  new Request(`https://curiofold.test/api/v1/account/export${query}`)

describe('account export', () => {
  it.each([
    ['unauthenticated', 401],
    ['account_disabled', 403],
    ['identity_unavailable', 503],
  ] as const)('rejects %s without reading data', async (code, status) => {
    const exportSource = vi.fn()
    const response = await createAccountExportResponse(
      request(),
      'request-id',
      {
        authorizationSource: () =>
          Promise.reject(new IdentitySessionError(code)),
        exportSource,
      },
    )
    expect(response.status).toBe(status)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(exportSource).not.toHaveBeenCalled()
  })
  it('requires verified email and an active account', async () => {
    for (const override of [
      { emailVerified: false },
      { accountState: 'disabled' as const },
    ]) {
      const exportSource = vi.fn()
      const response = await createAccountExportResponse(
        request(),
        'request-id',
        {
          authorizationSource: () =>
            Promise.resolve({ ...authorization, ...override }),
          exportSource,
        },
      )
      expect(response.status).toBe(403)
      expect(exportSource).not.toHaveBeenCalled()
    }
  })
  it('rejects caller-supplied identity and downloads only session-owned data', async () => {
    const exportSource = vi
      .fn()
      .mockResolvedValue({ schemaVersion: 1, profile: { id: 'session-owner' } })
    const dependencies = {
      authorizationSource: () => Promise.resolve(authorization),
      exportSource,
    }
    const invalid = await createAccountExportResponse(
      request('?userId=someone-else'),
      'request-id',
      dependencies,
    )
    expect(invalid.status).toBe(400)
    expect(exportSource).not.toHaveBeenCalled()
    const response = await createAccountExportResponse(
      request(),
      'request-id',
      dependencies,
    )
    expect(exportSource).toHaveBeenCalledExactlyOnceWith('session-owner')
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="curiofold-account-data.json"',
    )
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toEqual({
      schemaVersion: 1,
      profile: { id: 'session-owner' },
    })
  })
  it('does not return a partial success when data retrieval fails', async () => {
    await expect(
      createAccountExportResponse(request(), 'request-id', {
        authorizationSource: () => Promise.resolve(authorization),
        exportSource: () => Promise.reject(new Error('database unavailable')),
      }),
    ).rejects.toThrow('database unavailable')
  })
})
