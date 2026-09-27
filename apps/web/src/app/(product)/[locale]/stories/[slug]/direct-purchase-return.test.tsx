// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DirectPurchaseReturn } from './direct-purchase-return'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const orderId = '11111111-1111-4111-8111-111111111111'
const storyId = '22222222-2222-4222-8222-222222222222'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  refresh.mockClear()
})

describe('direct Story purchase return', () => {
  it('waits for the matching owner-scoped fulfilled order before claiming ownership', async () => {
    let resolveOrder: (response: Response) => void = () => undefined
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveOrder = resolve
        }),
    )
    render(
      <DirectPurchaseReturn
        detailPath="/en/stories/clockwork"
        orderId={orderId}
        storyId={storyId}
      />,
    )

    expect(screen.getByText('Confirming your Story purchase…')).toBeTruthy()
    expect(screen.queryByText(/Story is now in your Library/u)).toBeNull()
    resolveOrder(
      Response.json({
        amountMinor: 130,
        currency: 'EUR',
        orderId,
        purchaseType: 'individual_story',
        status: 'fulfilled',
        storyId,
      }),
    )
    await waitFor(() => {
      expect(
        screen.getByText(
          'Payment confirmed. This Story is now in your Library.',
        ),
      ).toBeTruthy()
    })
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('does not accept a fulfilled credit order as proof of Story ownership', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        amountMinor: 130,
        currency: 'EUR',
        orderId,
        purchaseType: 'credit_top_up',
        status: 'fulfilled',
        storyId: null,
      }),
    )
    render(
      <DirectPurchaseReturn
        detailPath="/en/stories/clockwork"
        orderId={orderId}
        storyId={storyId}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(/could not check your order/u)).toBeTruthy()
    })
    expect(refresh).not.toHaveBeenCalled()
  })
})
