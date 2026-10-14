import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ban: vi.fn(),
  list: vi.fn(),
  revoke: vi.fn(),
}))
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: () =>
    Promise.resolve({
      users: { banUser: mocks.ban },
      sessions: { getSessionList: mocks.list, revokeSession: mocks.revoke },
    }),
}))

import { deactivateClerkAccount } from './account-deletion-worker'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.ban.mockResolvedValue({})
  mocks.revoke.mockResolvedValue({})
})
describe('Clerk deletion coordination', () => {
  it('bans first and revokes every active session before success', async () => {
    mocks.list
      .mockResolvedValueOnce({ data: [{ id: 'session1' }, { id: 'session2' }] })
      .mockResolvedValueOnce({ data: [] })
    await deactivateClerkAccount('subject')
    expect(mocks.ban).toHaveBeenCalledExactlyOnceWith('subject')
    expect(mocks.ban).toHaveBeenCalledBefore(mocks.list)
    expect(mocks.revoke.mock.calls).toEqual([['session1'], ['session2']])
  })
  it('propagates provider failure so durable work can retry', async () => {
    mocks.ban.mockRejectedValue(new Error('provider unavailable'))
    await expect(deactivateClerkAccount('subject')).rejects.toThrow(
      'provider unavailable',
    )
    expect(mocks.list).not.toHaveBeenCalled()
  })
  it('retries revocation safely after the user was already banned', async () => {
    mocks.list.mockResolvedValue({ data: [] })
    await deactivateClerkAccount('subject')
    await deactivateClerkAccount('subject')
    expect(mocks.ban).toHaveBeenCalledTimes(2)
    expect(mocks.revoke).not.toHaveBeenCalled()
  })
})
