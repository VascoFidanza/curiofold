import { quoteCreditTopUp, quoteDirectStoryPurchase } from '@curiofold/domain'
import type { Client } from 'pg'
import { expect } from 'vitest'

import type { createDatabase } from './client'
import { ensureIdentityAccount } from './identity'
import {
  createPaymentOrder,
  PaymentOrderConflictError,
  PaymentOrderRateLimitError,
  type CreatePaymentOrderInput,
} from './payment-orders'

export async function assertCheckoutLimitIntegration(
  database: ReturnType<typeof createDatabase>['client'],
  client: Client,
  storyId: string,
) {
  const account = await ensureIdentityAccount(
    database,
    'user_checkout_limit_fixture',
    new Date(),
  )
  const topUp = quoteCreditTopUp(500)
  const commands: CreatePaymentOrderInput[] = Array.from(
    { length: 12 },
    (_, index) => ({
      operationKey: `checkout-limit-${String(index)}`,
      userId: account.userId,
      snapshot:
        index % 2
          ? { ...quoteDirectStoryPurchase(), packKey: 'story-direct-v1' }
          : {
              ...topUp,
              credits: topUp.totalCredits,
              packKey: 'top-up-v1',
              purchaseType: 'credit_top_up',
            },
      storyId: index % 2 ? storyId : null,
    }),
  )
  const results = await Promise.allSettled(
    commands.map((command) => createPaymentOrder(database, command)),
  )
  const successful = results.filter((result) => result.status === 'fulfilled')
  expect(successful).toHaveLength(10)
  const rejected = results.filter((result) => result.status === 'rejected')
  expect(rejected).toHaveLength(2)
  for (const result of rejected) {
    expect(result.reason).toBeInstanceOf(PaymentOrderRateLimitError)
    const error = result.reason as PaymentOrderRateLimitError
    expect(error.retryAfterSeconds).toBeGreaterThan(0)
    expect(error.retryAfterSeconds).toBeLessThanOrEqual(300)
  }
  const winningInput =
    commands[results.findIndex((result) => result.status === 'fulfilled')]
  if (!winningInput) throw new Error('Missing successful checkout command')
  await expect(
    createPaymentOrder(database, winningInput),
  ).resolves.toMatchObject({ created: false })
  await expect(
    createPaymentOrder(database, { ...winningInput, returnPath: '/account' }),
  ).rejects.toBeInstanceOf(PaymentOrderConflictError)
  const rows = await client.query<{ count: string; types: string[] }>(
    'SELECT count(*), array_agg(DISTINCT purchase_type) AS types FROM payment_orders WHERE user_id=$1',
    [account.userId],
  )
  expect(rows.rows[0]?.count).toBe('10')
  expect(rows.rows[0]?.types).toEqual(
    expect.arrayContaining(['credit_top_up', 'individual_story']),
  )
  const audits = await client.query<{ count: string }>(
    "SELECT count(*) FROM audit_events WHERE actor_user_id=$1 AND action='payment.order_created'",
    [account.userId],
  )
  expect(audits.rows[0]?.count).toBe('10')
  const ledger = await client.query<{ count: string }>(
    'SELECT count(*) FROM wallet_entries e JOIN wallet_accounts w ON w.id=e.wallet_account_id WHERE w.user_id=$1',
    [account.userId],
  )
  expect(ledger.rows[0]?.count).toBe('0')
  const other = await ensureIdentityAccount(
    database,
    'user_checkout_limit_other',
    new Date(),
  )
  await expect(
    createPaymentOrder(database, { ...winningInput, userId: other.userId }),
  ).resolves.toMatchObject({ created: true })
  // Seed historical immutable orders; never rewrite existing commercial snapshots.
  const historical = await ensureIdentityAccount(
    database,
    'user_checkout_limit_historical',
    new Date(),
  )
  for (let index = 0; index < 10; index++)
    await createPaymentOrder(database, {
      ...winningInput,
      userId: historical.userId,
      operationKey: `historical-${String(index)}`,
      createdAt: new Date(Date.now() - 6 * 60_000),
    })
  await expect(
    createPaymentOrder(database, {
      ...winningInput,
      userId: historical.userId,
      operationKey: 'checkout-limit-after-window',
    }),
  ).resolves.toMatchObject({ created: true })
}
