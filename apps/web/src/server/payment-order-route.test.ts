import { describe, expect, it, vi } from 'vitest'

import type { AuthorizationContext } from '@curiofold/domain'
import type { PaymentOrderRecord } from '@curiofold/db'

import { IdentitySessionError } from './identity'
import { createPaymentOrderStatusResponse } from './payment-order-route'

const orderId = '22222222-2222-4222-8222-222222222222'
const authorization: AuthorizationContext = {
  accountState: 'active',
  emailVerified: true,
  firstFactorVerifiedAt: null,
  secondFactorVerifiedAt: null,
  staffRoles: new Set(),
  userId: '11111111-1111-4111-8111-111111111111',
}

function order(status: PaymentOrderRecord['status']): PaymentOrderRecord {
  return {
    amountMinor: 500,
    createdAt: '2026-09-24T10:00:00.000Z',
    credits: 5,
    currency: 'EUR',
    id: orderId,
    operationKey: 'checkout:private-operation',
    packKey: 'five-credits',
    providerCheckoutSessionId: 'cs_test_private',
    providerKey: 'stripe',
    providerPaymentId: status === 'fulfilled' ? 'pi_test_private' : null,
    storyId: null,
    returnPath: '/en/stories/example',
    status,
    updatedAt: '2026-09-24T10:01:00.000Z',
    userId: authorization.userId,
  }
}

describe('payment-order status route', () => {
  it('requires authentication before reading an order', async () => {
    const orderSource = vi.fn()
    const response = await createPaymentOrderStatusResponse(
      orderId,
      'request-auth',
      {
        authorizationSource: () =>
          Promise.reject(new IdentitySessionError('unauthenticated')),
        orderSource,
      },
    )
    expect(response.status).toBe(401)
    expect(orderSource).not.toHaveBeenCalled()
  })

  it('uses an owner-scoped lookup and does not reveal another user order', async () => {
    const orderSource = vi.fn().mockResolvedValue(null)
    const response = await createPaymentOrderStatusResponse(
      orderId,
      'request-owner',
      {
        authorizationSource: () => Promise.resolve(authorization),
        orderSource,
      },
    )
    expect(response.status).toBe(404)
    expect(orderSource).toHaveBeenCalledWith(orderId, authorization.userId)
  })

  it.each(['pending', 'checkout_created', 'payment_pending'] as const)(
    'reports %s truthfully as processing rather than paid',
    async (status) => {
      const response = await createPaymentOrderStatusResponse(
        orderId,
        'request-processing',
        {
          authorizationSource: () => Promise.resolve(authorization),
          orderSource: () => Promise.resolve(order(status)),
        },
      )
      await expect(response.json()).resolves.toMatchObject({
        status: 'processing',
      })
    },
  )

  it('returns a customer-safe fulfilled projection without provider or idempotency data', async () => {
    const response = await createPaymentOrderStatusResponse(
      orderId,
      'request-fulfilled',
      {
        authorizationSource: () => Promise.resolve(authorization),
        orderSource: () => Promise.resolve(order('fulfilled')),
      },
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = await response.json()
    expect(body).toEqual({
      amountMinor: 500,
      credits: 5,
      currency: 'EUR',
      orderId,
      status: 'fulfilled',
      updatedAt: '2026-09-24T10:01:00.000Z',
    })
    expect(body).not.toHaveProperty('providerPaymentId')
    expect(body).not.toHaveProperty('operationKey')
  })
})
