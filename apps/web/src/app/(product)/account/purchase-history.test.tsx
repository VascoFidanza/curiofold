// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PurchaseHistory } from './purchase-history'

afterEach(cleanup)

describe('Account purchase history', () => {
  it('explains an empty payment history', () => {
    render(<PurchaseHistory purchases={[]} />)

    expect(
      screen.getByRole('heading', { name: 'Recent purchases' }),
    ).toBeTruthy()
    expect(screen.getByText(/No purchases yet/u)).toBeTruthy()
  })

  it('shows direct and top-up payments without exposing internal identifiers', () => {
    const { container } = render(
      <PurchaseHistory
        purchases={[
          {
            amountMinor: 130,
            createdAt: new Date('2026-09-26T12:00:00Z'),
            credits: 0,
            currency: 'EUR',
            id: 'private-direct-order-id',
            kind: 'individual_story',
            reversals: [
              { amountMinor: 130, kind: 'refund', status: 'manual_review' },
            ],
            status: 'fulfilled',
            story: { slug: 'clockwork-gardens', title: 'Clockwork Gardens' },
          },
          {
            amountMinor: 500,
            createdAt: new Date('2026-09-25T12:00:00Z'),
            credits: 5,
            currency: 'EUR',
            id: 'private-topup-order-id',
            kind: 'credit_top_up',
            reversals: [],
            status: 'payment_pending',
            story: null,
          },
        ]}
      />,
    )

    expect(screen.getByText('Clockwork Gardens')).toBeTruthy()
    expect(screen.getByText('Credit top-up · 5 credits')).toBeTruthy()
    expect(screen.getByText('€1.30')).toBeTruthy()
    expect(screen.getByText('€5.00')).toBeTruthy()
    expect(screen.getByText(/Refund under review/u)).toBeTruthy()
    expect(screen.getByText('Awaiting payment confirmation')).toBeTruthy()
    expect(container.textContent).not.toMatch(
      /private-direct-order-id|private-topup-order-id/u,
    )
  })
})
