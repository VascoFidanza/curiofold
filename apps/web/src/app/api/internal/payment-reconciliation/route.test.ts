import { describe, expect, it, vi } from 'vitest'

const { runBatch } = vi.hoisted(() => ({ runBatch: vi.fn() }))

vi.mock('@/server/payment-reconciliation-worker', () => ({
  runPaymentReconciliationBatch: runBatch,
}))

import { POST } from './route'

describe('payment reconciliation scheduler route', () => {
  it('rejects requests without the configured bearer secret', async () => {
    vi.stubEnv('CRON_SECRET', 'a'.repeat(32))
    runBatch.mockReset()
    const response = await POST(
      new Request('https://curiofold.test/api/internal/payment-reconciliation'),
    )
    expect(response.status).toBe(401)
    expect(runBatch).not.toHaveBeenCalled()
  })

  it('runs a batch only with the exact bearer secret', async () => {
    vi.stubEnv('CRON_SECRET', 'b'.repeat(32))
    runBatch.mockResolvedValue({
      claimed: 2,
      completed: 1,
      exhausted: 0,
      failed: 1,
    })
    const response = await POST(
      new Request(
        'https://curiofold.test/api/internal/payment-reconciliation',
        {
          headers: { Authorization: `Bearer ${'b'.repeat(32)}` },
        },
      ),
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      claimed: 2,
      completed: 1,
      exhausted: 0,
      failed: 1,
    })
  })
})
