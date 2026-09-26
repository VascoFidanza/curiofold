// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CreditsPurchase } from './purchase'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('credit purchase', () => {
  it('shows canonical credit totals and reuses the checkout key after failure', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 503 }))
    render(<CreditsPurchase orderId={null} returnPath="/account" />)

    expect(screen.getByText('5 credits')).toBeTruthy()
    expect(screen.getByText('11 credits')).toBeTruthy()
    expect(screen.getByText('23 credits')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    const first = fetchMock.mock.calls[0]?.[1]
    const second = fetchMock.mock.calls[1]?.[1]
    expect(first?.headers).toEqual(second?.headers)
    expect(first?.body).toBe(
      JSON.stringify({
        amountEUR: 5,
        returnPath: '/credits?return=%2Faccount',
      }),
    )
  })

  it('waits for the owner-scoped order before claiming credits were added', async () => {
    let resolveOrder: (response: Response) => void = () => undefined
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveOrder = resolve
        }),
    )
    const orderId = '11111111-1111-4111-8111-111111111111'
    render(<CreditsPurchase orderId={orderId} returnPath="/account" />)

    expect(screen.getByText('Confirming your payment')).toBeTruthy()
    expect(screen.queryByText(/credits added/u)).toBeNull()

    resolveOrder(Response.json({ credits: 11, orderId, status: 'fulfilled' }))
    await waitFor(() => {
      expect(screen.getByText('11 credits added')).toBeTruthy()
    })
    expect(
      screen
        .getByRole('link', { name: 'View your Account' })
        .getAttribute('href'),
    ).toBe('/account')
  })
})
