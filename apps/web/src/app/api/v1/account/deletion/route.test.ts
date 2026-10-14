import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ status: vi.fn() }))
vi.mock('@curiofold/db', () => ({
  findAccountDeletionReceipt: mocks.status,
  findAccountDeletionReceiptId: vi.fn(),
  requestAccountDeletion: vi.fn(),
}))
vi.mock('@/server/database', () => ({ getDatabase: () => ({ client: {} }) }))
vi.mock('@/server/identity', () => ({
  IdentitySessionError: class extends Error {},
  requireAuthorizationContext: vi.fn(),
}))

import { GET, POST } from './route'

describe('deletion boundary', () => {
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
