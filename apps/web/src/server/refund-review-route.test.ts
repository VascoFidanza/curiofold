import { describe, expect, it, vi } from 'vitest'
import type { AuthorizationContext, StaffRole } from '@curiofold/domain'
import {
  FinanceAuthorizationError,
  PaymentReversalConflictError,
  PaymentReversalUnavailableError,
  type PaymentReversalRecord,
} from '@curiofold/db'

import { IdentitySessionError } from './identity'
import { createRefundReviewResponse } from './refund-review-route'

const orderId = '11111111-1111-4111-8111-111111111111'
const authorization: AuthorizationContext = {
  accountState: 'active',
  emailVerified: true,
  firstFactorVerifiedAt: new Date(),
  secondFactorVerifiedAt: new Date(),
  staffRoles: new Set(['finance']),
  userId: '22222222-2222-4222-8222-222222222222',
}
const reversal: PaymentReversalRecord = {
  amountMinor: 130,
  completedAt: null,
  createdAt: new Date().toISOString(),
  createdByUserId: authorization.userId,
  creditsRequested: 0,
  currency: 'EUR',
  id: '33333333-3333-4333-8333-333333333333',
  kind: 'refund',
  operationKey: 'private-operation-key',
  orderId,
  providerKey: 'stripe',
  providerReversalId: 'private-provider-id',
  reasonCode: 'customer_request',
  status: 'manual_review',
  updatedAt: new Date().toISOString(),
}
function request(
  body: unknown = { orderId, reasonCode: 'customer_request' },
  overrides: Record<string, string> = {},
) {
  return new Request('https://curiofold.test/api/internal/payment-reversals', {
    method: 'POST',
    headers: {
      Origin: 'https://curiofold.test',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'review-key-123',
      ...overrides,
    },
    body: JSON.stringify(body),
  })
}
const authorize = () => Promise.resolve(authorization)

describe('guarded finance review route', () => {
  it.each([
    'unauthenticated',
    'account_disabled',
    'identity_unavailable',
  ] as const)('handles %s without accessing orders', async (code) => {
    const requestReview = vi.fn()
    const response = await createRefundReviewResponse(request(), 'request-1', {
      authorizationSource: () => Promise.reject(new IdentitySessionError(code)),
      requestReview,
    })
    expect(response.status).toBe(
      code === 'unauthenticated'
        ? 401
        : code === 'account_disabled'
          ? 403
          : 503,
    )
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(requestReview).not.toHaveBeenCalled()
  })

  it.each([
    new Set<StaffRole>(),
    new Set<StaffRole>(['support']),
    new Set<StaffRole>(['publisher']),
  ])('denies unauthorized roles', async (staffRoles) => {
    const requestReview = vi.fn()
    const response = await createRefundReviewResponse(request(), 'request-1', {
      authorizationSource: () =>
        Promise.resolve({ ...authorization, staffRoles }),
      requestReview,
    })
    expect(response.status).toBe(403)
    expect(requestReview).not.toHaveBeenCalled()
  })

  it.each([
    { accountState: 'pending_deletion' as const },
    { emailVerified: false },
    { firstFactorVerifiedAt: null },
    { secondFactorVerifiedAt: null },
    { firstFactorVerifiedAt: new Date(Date.now() - 16 * 60_000) },
    { secondFactorVerifiedAt: new Date(Date.now() - 16 * 60_000) },
  ])(
    'requires active verified recent two-factor authorization: %j',
    async (override) => {
      const requestReview = vi.fn()
      const response = await createRefundReviewResponse(
        request(),
        'request-1',
        {
          authorizationSource: () =>
            Promise.resolve({ ...authorization, ...override }),
          requestReview,
        },
      )
      expect(response.status).toBe(403)
      expect(requestReview).not.toHaveBeenCalled()
    },
  )

  it.each([
    { Origin: 'https://attacker.test' },
    { Origin: '' },
    { 'Sec-Fetch-Site': 'cross-site' },
    { 'Sec-Fetch-Site': 'same-site' },
  ])('rejects unsafe origins: %j', async (headers) => {
    const requestReview = vi.fn()
    const response = await createRefundReviewResponse(
      request(undefined, headers),
      'request-1',
      { authorizationSource: authorize, requestReview },
    )
    expect(response.status).toBe(403)
    expect(requestReview).not.toHaveBeenCalled()
  })

  it.each([
    { orderId, reasonCode: 'customer_request', amountMinor: 1 },
    { orderId, reasonCode: 'customer_request', creditsRequested: 999 },
    { orderId, reasonCode: 'customer_request', createdByUserId: orderId },
    { orderId, reasonCode: 'customer_request', status: 'completed' },
    { orderId: 'invalid', reasonCode: 'customer_request' },
    { orderId, reasonCode: 'arbitrary_text' },
    null,
    [],
    {},
    { orderId, reasonCode: 'x'.repeat(2048) },
  ])('rejects malformed or tampered input', async (body) => {
    const requestReview = vi.fn()
    const response = await createRefundReviewResponse(
      request(body),
      'request-1',
      { authorizationSource: authorize, requestReview },
    )
    expect(response.status).toBe(400)
    expect(requestReview).not.toHaveBeenCalled()
  })

  it.each(['', 'short', 'x'.repeat(129)])(
    'requires a bounded idempotency key',
    async (key) => {
      const requestReview = vi.fn()
      const response = await createRefundReviewResponse(
        request(undefined, { 'Idempotency-Key': key }),
        'request-1',
        { authorizationSource: authorize, requestReview },
      )
      expect(response.status).toBe(400)
      expect(requestReview).not.toHaveBeenCalled()
    },
  )

  it.each([true, false])(
    'returns a safe policy-gated result (created=%s)',
    async (created) => {
      const requestReview = vi.fn().mockResolvedValue({ created, reversal })
      const response = await createRefundReviewResponse(
        request(),
        'correlation-123',
        { authorizationSource: authorize, requestReview },
      )
      expect(response.status).toBe(created ? 201 : 200)
      expect(requestReview).toHaveBeenCalledWith({
        authorization,
        correlationId: 'correlation-123',
        operationKey: 'review-key-123',
        orderId,
        reasonCode: 'customer_request',
      })
      const body = (await response.json()) as unknown
      expect(body).toMatchObject({
        policyRequired: true,
        review: {
          amountMinor: 130,
          creditsRequested: 0,
          status: 'manual_review',
        },
      })
      expect(JSON.stringify(body)).not.toMatch(
        /private-operation-key|private-provider-id|createdByUserId/u,
      )
    },
  )

  it('rejects malformed JSON and unsupported media before creating a case', async () => {
    const requestReview = vi.fn()
    const malformed = new Request(request(), { body: '{' })
    expect(
      (
        await createRefundReviewResponse(malformed, 'request-invalid', {
          authorizationSource: authorize,
          requestReview,
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await createRefundReviewResponse(
          request(undefined, { 'Content-Type': 'text/plain' }),
          'request-invalid',
          { authorizationSource: authorize, requestReview },
        )
      ).status,
    ).toBe(415)
    expect(requestReview).not.toHaveBeenCalled()
  })

  it.each([
    [new FinanceAuthorizationError(), 403],
    [new PaymentReversalConflictError(), 409],
    [new PaymentReversalUnavailableError('amount_exceeded'), 409],
    [new Error('secret-provider-payload'), 503],
  ] as const)(
    'handles transaction-time failures safely',
    async (error, status) => {
      const response = await createRefundReviewResponse(
        request(),
        'request-1',
        {
          authorizationSource: authorize,
          requestReview: () => Promise.reject(error),
        },
      )
      expect(response.status).toBe(status)
      expect(await response.text()).not.toContain('secret-provider-payload')
    },
  )

  it('guards queue reads and rejects query-based scope overrides', async () => {
    const list = vi.fn().mockResolvedValue([])
    const response = await createRefundReviewResponse(
      new Request('https://curiofold.test/api/internal/payment-reversals'),
      'request-list',
      { authorizationSource: authorize, list },
    )
    expect(response.status).toBe(200)
    expect(list).toHaveBeenCalledWith(authorization)
    await expect(response.json()).resolves.toEqual({
      reviews: [],
      policyRequired: true,
    })
    const invalid = await createRefundReviewResponse(
      new Request(
        'https://curiofold.test/api/internal/payment-reversals?limit=999',
      ),
      'request-list',
      { authorizationSource: authorize, list },
    )
    expect(invalid.status).toBe(400)
    expect(list).toHaveBeenCalledTimes(1)
  })
})
