import { describe, expect, it } from 'vitest'
import { readPaymentOperationsHealth } from './payment-operations'

describe('operations privacy-job diagnostics', () => {
  it.each([
    [false, false, []],
    [true, false, ['deletion_jobs_exhausted']],
    [false, true, ['deletion_jobs_overdue']],
    [true, true, ['deletion_jobs_exhausted', 'deletion_jobs_overdue']],
  ])(
    'maps only bounded diagnostic codes (%s, %s)',
    async (exhausted, overdue, codes) => {
      const now = new Date()
      const database = {
        select: () => ({
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () =>
                  Promise.resolve([
                    { createdAt: now, metadata: { codes: [] } },
                  ]),
              }),
            }),
          }),
        }),
        execute: () =>
          Promise.resolve({
            rows: [{ deletionExhausted: exhausted, deletionOverdue: overdue }],
          }),
      } as unknown as Parameters<typeof readPaymentOperationsHealth>[0]
      expect(await readPaymentOperationsHealth(database, now)).toEqual({
        healthy: codes.length === 0,
        codes,
      })
    },
  )
})
