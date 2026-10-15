import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  complete: vi.fn(),
  find: vi.fn(),
  process: vi.fn(),
  record: vi.fn(),
  retry: vi.fn(),
}))
vi.mock('@curiofold/db', () => ({
  claimPaymentReconciliationJobs: mocks.claim,
  completePaymentReconciliationJob: mocks.complete,
  findPaymentOrderById: mocks.find,
  processProviderEvent: mocks.process,
  recordProviderEvent: mocks.record,
  reschedulePaymentReconciliationJob: mocks.retry,
}))
vi.mock('./database', () => ({ getDatabase: vi.fn() }))
import { runPaymentReconciliationBatch } from './payment-reconciliation-worker'
import type { PaymentProvider } from '@curiofold/domain'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.claim.mockResolvedValue([
    { id: 'job', orderId: 'order', attemptCount: 0 },
  ])
  mocks.find.mockResolvedValue({
    providerCheckoutSessionId: 'session',
    providerKey: 'stripe',
    status: 'checkout_created',
  })
  mocks.record.mockResolvedValue({ created: true })
  mocks.process.mockResolvedValue({ outcome: 'duplicate' })
  mocks.retry.mockResolvedValue({ status: 'pending' })
})
const provider = {
  retrieveOrder: () =>
    Promise.resolve({
      state: 'paid',
      providerSessionId: 'session',
      providerPaymentId: 'payment',
      checkoutUrl: null,
    }),
} as unknown as PaymentProvider
const run = () =>
  runPaymentReconciliationBatch({
    database: {} as never,
    provider,
    limit: 5,
    leaseForMs: 300_000,
  })

describe('reconciliation duplicate recovery', () => {
  it.each(['fulfilled', 'canceled'])(
    'closes duplicate %s orders without retry or fulfilment writes',
    async (status) => {
      mocks.find.mockResolvedValue({
        providerCheckoutSessionId: 'session',
        providerKey: 'stripe',
        status,
      })
      expect(await run()).toEqual({
        claimed: 1,
        completed: 1,
        exhausted: 0,
        failed: 0,
      })
      expect(mocks.complete).toHaveBeenCalledTimes(1)
      expect(mocks.retry).not.toHaveBeenCalled()
      expect(mocks.claim).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ limit: 5, leaseForMs: 300_000 }),
      )
    },
  )
  it('does not close duplicate nonterminal events', async () => {
    expect((await run()).failed).toBe(1)
    expect(mocks.complete).not.toHaveBeenCalled()
    expect(mocks.retry).toHaveBeenCalledTimes(1)
  })
  it('persists provider failures for later retries without propagating secrets', async () => {
    const unavailable = {
      retrieveOrder: () => Promise.reject(new Error('private')),
    } as unknown as PaymentProvider
    expect(
      (
        await runPaymentReconciliationBatch({
          database: {} as never,
          provider: unavailable,
        })
      ).failed,
    ).toBe(1)
    expect(mocks.retry).toHaveBeenCalledWith(
      {},
      'job',
      expect.objectContaining({ errorCode: 'reconciliation_failed' }),
    )
  })
})
