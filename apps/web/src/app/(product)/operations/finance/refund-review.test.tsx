// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RefundReviewPanel } from './refund-review'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function fill() {
  fireEvent.change(screen.getByLabelText('Payment order ID'), {
    target: { value: '11111111-1111-4111-8111-111111111111' },
  })
}

describe('finance refund review panel', () => {
  it('explains the policy gate and empty queue without suggesting a refund was paid', () => {
    render(<RefundReviewPanel reviews={[]} />)
    expect(screen.getByText(/Refund execution is disabled/u)).toBeTruthy()
    expect(screen.getByText('No payment reversal cases recorded.')).toBeTruthy()
    expect(screen.getByLabelText('Reason')).toBeTruthy()
  })

  it('reuses the request key after uncertain failure and blocks duplicate submissions', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(new Response('{}', { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<RefundReviewPanel reviews={[]} />)
    fill()
    fireEvent.click(
      screen.getByRole('button', { name: 'Record refund review' }),
    )
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain(
        'Retry with the same details',
      )
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Record refund review' }),
    )
    const form = screen.getByLabelText('Payment order ID').closest('form')
    if (!form) throw new Error('Review form missing')
    fireEvent.submit(form)
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain(
        'No refund was issued',
      )
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const first = fetchMock.mock.calls[0]?.[1] as RequestInit
    const second = fetchMock.mock.calls[1]?.[1] as RequestInit
    expect(new Headers(first.headers).get('idempotency-key')).toBe(
      new Headers(second.headers).get('idempotency-key'),
    )
    expect(JSON.parse(first.body as string)).toEqual({
      orderId: '11111111-1111-4111-8111-111111111111',
      reasonCode: 'customer_request',
    })
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Review recorded' })
        .disabled,
    ).toBe(true)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('explains stale authorization without claiming success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 403 })),
    )
    render(<RefundReviewPanel reviews={[]} />)
    fill()
    fireEvent.click(
      screen.getByRole('button', { name: 'Record refund review' }),
    )
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain(
        'both factors verified',
      )
    })
    expect(refresh).not.toHaveBeenCalled()
  })
})
