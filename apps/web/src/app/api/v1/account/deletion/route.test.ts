import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  authorize: vi.fn(),
  request: vi.fn(),
  receipt: vi.fn(),
}))
vi.mock('@curiofold/db', () => ({
  findAccountDeletionReceipt: mocks.status,
  findAccountDeletionReceiptId: mocks.receipt,
  requestAccountDeletion: mocks.request,
}))
vi.mock('@/server/database', () => ({ getDatabase: () => ({ client: {} }) }))
vi.mock('@/server/identity', () => ({
  IdentitySessionError: class extends Error {},
  requireAuthorizationContext: mocks.authorize,
}))

import { GET, POST } from './route'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.authorize.mockResolvedValue({
    userId: 'owner',
    emailVerified: true,
    firstFactorVerifiedAt: new Date(),
  })
  mocks.receipt.mockResolvedValue('11111111-1111-4111-8111-111111111111')
})
function confirmed(body = { confirmation: 'DELETE' }) {
  return new Request('https://curiofold.test/api/v1/account/deletion', {
    method: 'POST',
    headers: {
      Origin: 'https://curiofold.test',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('deletion boundary', () => {
  it('accepts only the authenticated owner and sets a protected status receipt', async () => {
    const response = await POST(confirmed())
    expect(response.status).toBe(202)
    expect(mocks.request).toHaveBeenCalledWith({}, 'owner')
    expect(response.headers.get('set-cookie')).toContain(
      'HttpOnly; Secure; SameSite=Strict',
    )
  })
  it.each([null, new Date(Date.now() - 16 * 60_000)])(
    'requires recent identity verification (%s)',
    async (firstFactorVerifiedAt) => {
      mocks.authorize.mockResolvedValue({
        userId: 'owner',
        emailVerified: true,
        firstFactorVerifiedAt,
      })
      expect((await POST(confirmed())).status).toBe(403)
      expect(mocks.request).not.toHaveBeenCalled()
    },
  )
  it('rejects unconfirmed and injected ownership fields', async () => {
    expect((await POST(confirmed({ confirmation: 'NO' }))).status).toBe(400)
    const request = confirmed()
    const body = (await request.json()) as object
    expect(
      (
        await POST(
          new Request(request.url, {
            method: 'POST',
            headers: request.headers,
            body: JSON.stringify({ ...body, userId: 'victim' }),
          }),
        )
      ).status,
    ).toBe(400)
    expect(mocks.request).not.toHaveBeenCalled()
  })
  it('reports database failures without claiming acceptance or leaking details', async () => {
    mocks.request.mockRejectedValue(new Error('private database details'))
    const response = await POST(confirmed())
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('private database')
    expect(response.headers.has('set-cookie')).toBe(false)
  })
  it('rejects cross-origin mutations before identity or database work', async () => {
    const response = await POST(
      new Request('https://curiofold.test/api/v1/account/deletion', {
        method: 'POST',
        headers: { Origin: 'https://attacker.test' },
      }),
    )
    expect(response.status).toBe(403)
  })
  it('rejects missing or malformed receipts', async () => {
    mocks.status.mockReset()
    const response = await GET(
      new Request('https://curiofold.test/api/v1/account/deletion', {
        headers: { Cookie: 'curiofold_deletion=bad' },
      }),
    )
    expect(response.status).toBe(404)
    expect(mocks.status).not.toHaveBeenCalled()
  })
  it('returns only processing state for the opaque receipt without caching', async () => {
    mocks.status.mockResolvedValue({ status: 'retention_review' })
    const response = await GET(
      new Request('https://curiofold.test/api/v1/account/deletion', {
        headers: {
          Cookie: 'curiofold_deletion=11111111-1111-4111-8111-111111111111',
        },
      }),
    )
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    await expect(response.json()).resolves.toEqual({
      status: 'retention_review',
    })
  })
})
