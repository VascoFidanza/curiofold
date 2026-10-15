import { describe, expect, it, vi } from 'vitest'

import { requestAccountDeletion } from './account-deletion'
import * as schema from './schema'

function fixture(state: string | null) {
  const values = vi.fn().mockResolvedValue(undefined)
  const whereUpdate = vi.fn().mockResolvedValue(undefined)
  const transaction = {
    select: () => ({
      from: () => ({
        where: () => ({ for: () => Promise.resolve(state ? [{ state }] : []) }),
      }),
    }),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: whereUpdate })) })),
    insert: vi.fn((table: unknown) => {
      if (!table) throw new Error('Table required')
      return { values }
    }),
  }
  const database = {
    transaction: (run: (value: unknown) => unknown) =>
      Promise.resolve(run(transaction)),
  }
  return {
    database: database as unknown as Parameters<
      typeof requestAccountDeletion
    >[0],
    transaction,
    values,
  }
}

describe('account deletion request', () => {
  it('blocks access and queues cleanup without touching financial tables', async () => {
    const { database, transaction, values } = fixture('active')
    await expect(requestAccountDeletion(database, 'user-id')).resolves.toBe(
      'accepted',
    )
    expect(transaction.update).toHaveBeenCalledExactlyOnceWith(schema.users)
    expect(transaction.insert.mock.calls.map(([table]) => table)).toEqual([
      schema.outboxEvents,
      schema.auditEvents,
    ])
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'account.deletion_requested',
        payload: { userId: 'user-id' },
      }),
    )
  })

  it.each(['pending_deletion', 'disabled'])(
    'does not duplicate an existing %s request',
    async (state) => {
      const { database, transaction } = fixture(state)
      await expect(requestAccountDeletion(database, 'user-id')).resolves.toBe(
        'existing',
      )
      expect(transaction.update).not.toHaveBeenCalled()
      expect(transaction.insert).not.toHaveBeenCalled()
    },
  )

  it('rejects a missing account without writing', async () => {
    const { database, transaction } = fixture(null)
    await expect(requestAccountDeletion(database, 'missing')).rejects.toThrow(
      'Account unavailable.',
    )
    expect(transaction.insert).not.toHaveBeenCalled()
  })
})
