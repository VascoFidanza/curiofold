// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DirectPurchaseAction } from './direct-purchase-action'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('explains a checkout limit and preserves the direct-purchase retry key', async () => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(null, { status: 429 }))
  render(
    <DirectPurchaseAction
      storyId="11111111-1111-4111-8111-111111111111"
      detailPath="/en/stories/clockwork-gardens"
    />,
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Buy this Story for €1.30' }),
  )
  await waitFor(() => {
    expect(screen.getByText(/wait a few minutes/u)).toBeTruthy()
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Buy this Story for €1.30' }),
  )
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual(
    fetchMock.mock.calls[1]?.[1]?.headers,
  )
})
