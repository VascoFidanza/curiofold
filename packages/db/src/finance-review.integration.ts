import {
  quoteCreditTopUp,
  quoteDirectStoryPurchase,
  type AuthorizationContext,
} from '@curiofold/domain'
import { eq } from 'drizzle-orm'
import type { Client } from 'pg'
import { expect } from 'vitest'

import type { createDatabase } from './client'
import { ensureIdentityAccount } from './identity'
import {
  attachPaymentCheckoutSession,
  createPaymentOrder,
} from './payment-orders'
import { processProviderEvent, recordProviderEvent } from './payment-events'
import { exportAccountData } from './account-export'
import {
  FinanceAuthorizationError,
  listRefundReviews,
  PaymentReversalConflictError,
  PaymentReversalUnavailableError,
  requestRefundReview,
} from './payment-reversals'
import { staffRoleAssignments, users } from './schema'
import { unlockStoryWithCredit } from './story-unlocks'

/** Runs only inside the existing isolated PostgreSQL 18 integration database. */
export async function assertFinanceReviewIntegration(
  database: ReturnType<typeof createDatabase>['client'],
  client: Client,
  storyId: string,
) {
  const actor = await ensureIdentityAccount(
    database,
    'user_finance_review_operator',
    new Date(),
  )
  await database
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, actor.userId))
  const authorization: AuthorizationContext = {
    accountState: 'active',
    emailVerified: true,
    firstFactorVerifiedAt: new Date(),
    secondFactorVerifiedAt: new Date(),
    staffRoles: new Set(['finance']),
    userId: actor.userId,
  }
  const customer = await ensureIdentityAccount(
    database,
    'user_finance_review_customer',
    new Date(),
  )
  const directCustomer = await ensureIdentityAccount(
    database,
    'user_finance_direct_customer',
    new Date(),
  )
  const quote = quoteCreditTopUp(500)
  const orders = []
  for (const [index, snapshot] of [
    {
      ...quote,
      credits: quote.totalCredits,
      packKey: 'top-up-v1',
      purchaseType: 'credit_top_up' as const,
    },
    { ...quoteDirectStoryPurchase(), packKey: 'story-direct-v1' },
  ].entries()) {
    const { order } = await createPaymentOrder(database, {
      operationKey: `finance-review-order-${String(index)}`,
      snapshot,
      userId: index === 0 ? customer.userId : directCustomer.userId,
      storyId: index === 1 ? storyId : null,
    })
    const providerSessionId = `cs_test_finance_review_${String(index)}`
    const providerEventId = `evt_test_finance_review_${String(index)}`
    await attachPaymentCheckoutSession(database, {
      orderId: order.id,
      providerKey: 'stripe',
      providerSessionId,
    })
    await recordProviderEvent(database, {
      providerKey: 'stripe',
      providerEventId,
      eventType: 'checkout.session.completed',
      payloadDigest: 'e'.repeat(64),
      providerCreatedAt: new Date(),
    })
    await processProviderEvent(database, {
      providerKey: 'stripe',
      providerEventId,
      snapshot: {
        providerSessionId,
        providerPaymentId: `pi_test_finance_review_${String(index)}`,
        checkoutUrl: null,
        state: 'paid',
      },
    })
    orders.push(order)
  }
  const [topUpOrder, directOrder] = orders
  if (!topUpOrder || !directOrder) throw new Error('Missing fixture orders')
  await unlockStoryWithCredit(database, {
    userId: customer.userId,
    storyId,
    operationKey: 'finance-review-spent-credit',
  })
  const before = await Promise.all(
    [customer, directCustomer].map(({ userId }) =>
      exportAccountData(database, userId),
    ),
  )
  const input = {
    authorization,
    operationKey: 'review-idempotent',
    orderId: topUpOrder.id,
    reasonCode: 'customer_request',
    correlationId: 'finance-integration-123',
  }
  // A role in a session snapshot cannot replace a current database assignment.
  await expect(requestRefundReview(database, input)).rejects.toBeInstanceOf(
    FinanceAuthorizationError,
  )
  await expect(
    listRefundReviews(database, authorization),
  ).rejects.toBeInstanceOf(FinanceAuthorizationError)
  const [assignment] = await database
    .insert(staffRoleAssignments)
    .values({
      userId: actor.userId,
      role: 'finance',
      reason: 'Isolated finance integration',
    })
    .returning()
  if (!assignment) throw new Error('Missing finance assignment')
  await expect(
    requestRefundReview(database, {
      ...input,
      authorization: { ...authorization, secondFactorVerifiedAt: null },
    }),
  ).rejects.toBeInstanceOf(FinanceAuthorizationError)
  const results = await Promise.all([
    requestRefundReview(database, input),
    requestRefundReview(database, input),
  ])
  expect(results.filter(({ created }) => created)).toHaveLength(1)
  expect(new Set(results.map(({ reversal }) => reversal.id)).size).toBe(1)
  expect(results[0].reversal).toMatchObject({
    amountMinor: 500,
    creditsRequested: 5,
    status: 'manual_review',
    createdByUserId: actor.userId,
  })
  await expect(
    requestRefundReview(database, { ...input, reasonCode: 'payment_issue' }),
  ).rejects.toBeInstanceOf(PaymentReversalConflictError)
  await expect(
    requestRefundReview(database, {
      ...input,
      operationKey: 'review-another-key',
    }),
  ).rejects.toBeInstanceOf(PaymentReversalUnavailableError)
  const otherOperator = await ensureIdentityAccount(
    database,
    'user_finance_review_other_operator',
    new Date(),
  )
  await database
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, otherOperator.userId))
  await database.insert(staffRoleAssignments).values({
    userId: otherOperator.userId,
    role: 'finance',
    reason: 'Isolated concurrent operator fixture',
  })
  const directInput = {
    ...input,
    orderId: directOrder.id,
    operationKey: 'review-direct-key',
  }
  const competing = await Promise.allSettled([
    requestRefundReview(database, directInput),
    requestRefundReview(database, {
      ...directInput,
      authorization: { ...authorization, userId: otherOperator.userId },
    }),
  ])
  const winner = competing.find((result) => result.status === 'fulfilled')
  const loser = competing.find((result) => result.status === 'rejected')
  expect(loser?.reason).toBeInstanceOf(PaymentReversalUnavailableError)
  if (!winner) throw new Error('No concurrent review succeeded')
  const direct = winner.value
  expect(direct.reversal).toMatchObject({
    amountMinor: 130,
    creditsRequested: 0,
    status: 'manual_review',
  })
  const queue = await listRefundReviews(database, authorization)
  expect(queue.length).toBeLessThanOrEqual(50)
  expect(queue).toContainEqual(
    expect.objectContaining({
      id: direct.reversal.id,
      amountMinor: 130,
      status: 'manual_review',
    }),
  )
  expect(queue[0]).not.toHaveProperty('providerReversalId')
  for (const { reversal } of [results[0], direct]) {
    const audit = await client.query(
      'SELECT action, actor_user_id, correlation_id, reason FROM audit_events WHERE target_id=$1 ORDER BY action',
      [reversal.id],
    )
    expect(audit.rows).toHaveLength(2)
    expect(
      audit.rows.find(
        (row: { action: string }) =>
          row.action === 'payment.reversal_review_required',
      ),
    ).toMatchObject({
      actor_user_id: reversal.createdByUserId,
      correlation_id: input.correlationId,
      reason: 'customer_request',
    })
    expect(
      (
        await client.query<{ count: string }>(
          'SELECT count(*) FROM outbox_events WHERE aggregate_id=$1',
          [reversal.id],
        )
      ).rows[0]?.count,
    ).toBe('2')
  }
  const after = await Promise.all(
    [customer, directCustomer].map(({ userId }) =>
      exportAccountData(database, userId),
    ),
  )
  for (let index = 0; index < before.length; index++) {
    const beforeAccount = before[index]
    const afterAccount = after[index]
    if (!beforeAccount || !afterAccount)
      throw new Error('Missing account snapshot')
    for (const key of [
      'wallet',
      'ownership',
      'purchases',
      'walletTransactions',
    ] as const)
      expect(afterAccount[key]).toEqual(beforeAccount[key])
  }
  // Role revocation wins even if an earlier session still claims finance access.
  await database
    .update(staffRoleAssignments)
    .set({ revokedAt: new Date(), revokedByUserId: actor.userId })
    .where(eq(staffRoleAssignments.id, assignment.id))
  await expect(
    listRefundReviews(database, authorization),
  ).rejects.toBeInstanceOf(FinanceAuthorizationError)
  await expect(requestRefundReview(database, input)).rejects.toBeInstanceOf(
    FinanceAuthorizationError,
  )
  await database.insert(staffRoleAssignments).values({
    userId: actor.userId,
    role: 'admin',
    reason: 'Isolated administrator fixture',
  })
  await database
    .update(users)
    .set({ accountState: 'pending_deletion' })
    .where(eq(users.id, actor.userId))
  await expect(requestRefundReview(database, input)).rejects.toBeInstanceOf(
    FinanceAuthorizationError,
  )
  await expect(
    listRefundReviews(database, authorization),
  ).rejects.toBeInstanceOf(FinanceAuthorizationError)
  await database
    .update(users)
    .set({ accountState: 'active' })
    .where(eq(users.id, actor.userId))
  await expect(requestRefundReview(database, input)).resolves.toMatchObject({
    created: false,
  })
}
