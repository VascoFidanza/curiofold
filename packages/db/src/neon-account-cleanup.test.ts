import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  process: vi.fn(),
  on: vi.fn(),
}))
vi.mock('./client', () => ({ createDatabase: mocks.create }))
vi.mock('./account-deletion', () => ({
  processAccountDeletions: mocks.process,
}))

function delivery(
  body: unknown = {
    version: 1,
    invocation_id: 'invocation',
    trigger: { type: 'schedule', name: 'curiofold-account-cleanup' },
  },
) {
  return new Request('https://worker.example.test/', {
    method: 'POST',
    headers: { 'x-neon-trigger-invocation-id': 'invocation' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  vi.stubEnv('CURIOFOLD_ENVIRONMENT', 'nonproduction')
  vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fixture_not_a_secret')
  vi.stubEnv('CURIOFOLD_DATABASE_URL', 'postgresql://localhost/curiofold')
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mocks.create.mockReturnValue({ client: {}, pool: { on: mocks.on } })
  mocks.process.mockResolvedValue({ completed: 0, failed: 0 })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('nonproduction Neon cleanup boundary', () => {
  it('rejects public calls before connecting to the database', async () => {
    const { default: worker } =
      await import('../../../scripts/neon-account-cleanup')
    expect(
      (await worker.fetch(new Request('https://worker.example.test/'))).status,
    ).toBe(401)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it.each([null, {}, { version: 1, invocation_id: 'wrong' }])(
    'rejects invalid schedule payload %j',
    async (body) => {
      const { default: worker } =
        await import('../../../scripts/neon-account-cleanup')
      expect((await worker.fetch(delivery(body))).status).toBe(401)
      expect(mocks.create).not.toHaveBeenCalled()
    },
  )

  it.each([
    ['CURIOFOLD_ENVIRONMENT', 'production'],
    ['CLERK_SECRET_KEY', 'sk_live_fixture'],
    ['CURIOFOLD_DATABASE_URL', 'not-a-url-with-private-data'],
    ['CURIOFOLD_DATABASE_URL', 'postgresql://localhost/other'],
  ])(
    'fails closed for invalid %s without logging values',
    async (name, value) => {
      vi.stubEnv(name, value)
      const { default: worker } =
        await import('../../../scripts/neon-account-cleanup')
      expect((await worker.fetch(delivery())).status).toBe(503)
      expect(mocks.create).not.toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalled()
    },
  )

  it('reuses the pool and handles idle disconnects without logging the error', async () => {
    const { default: worker } =
      await import('../../../scripts/neon-account-cleanup')
    expect((await worker.fetch(delivery())).status).toBe(200)
    const listener = mocks.on.mock.calls[0]?.[1] as (error: Error) => void
    listener(new Error('connection-string-with-private-data'))
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify({ event: 'account_cleanup_pool_error' }),
    )
    expect((await worker.fetch(delivery())).status).toBe(200)
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })

  it('reports retryable processing failure without exposing the exception', async () => {
    mocks.process.mockRejectedValue(new Error('private provider error'))
    const { default: worker } =
      await import('../../../scripts/neon-account-cleanup')
    const response = await worker.fetch(delivery())
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ code: 'cleanup_unavailable' })
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify({
        event: 'account_cleanup_unavailable',
        invocationId: 'invocation',
      }),
    )
  })
})
