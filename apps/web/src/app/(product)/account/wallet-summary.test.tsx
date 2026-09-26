// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WalletSummary } from './wallet-summary'

afterEach(cleanup)

describe('Account wallet summary', () => {
  it('shows a zero balance without inventing transactions', () => {
    render(
      <WalletSummary
        wallet={{
          balance: { availableCredits: 0, version: 0 },
          nextCursor: null,
          transactions: [],
        }}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Your credits' })).toBeTruthy()
    expect(screen.getByText('0', { exact: false })).toBeTruthy()
    expect(screen.getByText(/No credit activity yet/u)).toBeTruthy()
  })

  it('shows ledger entries without exposing transaction identifiers', () => {
    const { container } = render(
      <WalletSummary
        wallet={{
          balance: { availableCredits: 4, version: 2 },
          nextCursor: null,
          transactions: [
            {
              credits: -1,
              id: 'secret-ledger-entry',
              kind: 'story_unlocked',
              occurredAt: new Date('2026-09-26T12:00:00Z'),
              storyId: 'internal-story-id',
            },
            {
              credits: 5,
              id: 'another-secret-ledger-entry',
              kind: 'credit_added',
              occurredAt: new Date('2026-09-25T12:00:00Z'),
              source: 'payment',
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('Story unlocked')).toBeTruthy()
    expect(screen.getByText('Credits added')).toBeTruthy()
    expect(screen.getByText('-1')).toBeTruthy()
    expect(screen.getByText('+5')).toBeTruthy()
    expect(container.textContent).not.toMatch(
      /secret-ledger-entry|internal-story-id/u,
    )
  })
})
