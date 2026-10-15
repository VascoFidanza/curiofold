import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  run: vi.fn(),
  audit: vi.fn(),
  health: vi.fn(),
  record: vi.fn(),
  transaction: vi.fn(),
  on: vi.fn(),
}))
vi.mock('../../../../packages/db/src/index', () => ({
  createDatabase: mocks.create,
  reconcileWallets: mocks.audit,
  readPaymentOperationsHealth: mocks.health,
  recordPaymentOperationsRun: mocks.record,
}))
vi.mock('./payment-reconciliation-worker', () => ({
  runPaymentReconciliationBatch: mocks.run,
}))
vi.mock('./stripe-payment-provider', () => ({
  createStripePaymentProvider: vi.fn(),
}))

const request = (
  body: unknown = {
    version: 1,
    invocation_id: 'tick',
    trigger: { type: 'schedule', name: 'curiofold-payment-operations' },
  },
) =>
  new Request('https://worker.test/', {
    method: 'POST',
    headers: { 'x-neon-trigger-invocation-id': 'tick' },
    body: JSON.stringify(body),
  })
const worker = async () =>
  (await import('../../../../scripts/neon-payment-operations')).default
beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  vi.stubEnv('CURIOFOLD_ENVIRONMENT', 'nonproduction')
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture')
  vi.stubEnv(
    'CURIOFOLD_DATABASE_URL',
    'postgresql://ep-dark-unit-b1s7k5cz.c-5.eu-central-1.aws.neon.tech/curiofold',
  )
  mocks.create.mockReturnValue({
    client: { transaction: mocks.transaction },
    pool: { on: mocks.on },
  })
  mocks.transaction.mockImplementation(
    (callback: (transaction: unknown) => Promise<void>) => callback({}),
  )
  mocks.run.mockResolvedValue({ failed: 0, exhausted: 0 })
  mocks.audit.mockResolvedValue({ healthy: true, nextWalletId: null })
  mocks.health.mockResolvedValue({ healthy: true, codes: [] })
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})
describe('payment operations boundary', () => {
  it.each([null, {}, { version: 1, invocation_id: 'wrong' }])(
    'rejects invalid schedule %j before DB access',
    async (body) => {
      expect((await (await worker()).fetch(request(body))).status).toBe(401)
      expect(mocks.create).not.toHaveBeenCalled()
    },
  )
  it.each([
    ['CURIOFOLD_ENVIRONMENT', 'production'],
    ['STRIPE_SECRET_KEY', 'sk_live_fixture'],
    ['CURIOFOLD_DATABASE_URL', 'private-malformed'],
    ['CURIOFOLD_DATABASE_URL', 'postgresql://other/curiofold'],
  ])('fails closed for %s', async (name, value) => {
    vi.stubEnv(name, value)
    expect((await (await worker()).fetch(request())).status).toBe(503)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('records durable health after bounded work and a read-only consistent audit', async () => {
    expect((await (await worker()).fetch(request())).status).toBe(200)
    expect(mocks.run).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, leaseForMs: 300_000 }),
    )
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'repeatable read',
      accessMode: 'read only',
    })
    expect(mocks.record).toHaveBeenCalledWith(expect.anything(), [])
  })
  it('public health is read-only and exposes no financial data', async () => {
    const response = await (
      await worker()
    ).fetch(new Request('https://worker.test/health'))
    expect(await response.json()).toEqual({ healthy: true, codes: [] })
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(mocks.run).not.toHaveBeenCalled()
    expect(mocks.record).not.toHaveBeenCalled()
  })
  it('bounds pagination and reports incomplete audits', async () => {
    mocks.audit.mockResolvedValue({ healthy: false, nextWalletId: 'cursor' })
    await (await worker()).fetch(request())
    expect(mocks.audit).toHaveBeenCalledTimes(10)
    expect(mocks.record).toHaveBeenCalledWith(expect.anything(), [
      'wallet_discrepancy',
      'audit_incomplete',
    ])
  })
  it('records redacted processing failures and recovers on the next run', async () => {
    mocks.run.mockRejectedValueOnce(new Error('secret'))
    const handler = await worker()
    await handler.fetch(request())
    expect(mocks.record).toHaveBeenLastCalledWith(expect.anything(), [
      'worker_failed',
    ])
    await handler.fetch(request())
    expect(mocks.record).toHaveBeenLastCalledWith(expect.anything(), [])
  })
  it('returns 503 for operational alerts', async () => {
    mocks.health.mockResolvedValue({
      healthy: false,
      codes: ['jobs_exhausted'],
    })
    const response = await (
      await worker()
    ).fetch(new Request('https://worker.test/health'))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      healthy: false,
      codes: ['jobs_exhausted'],
    })
  })
})
