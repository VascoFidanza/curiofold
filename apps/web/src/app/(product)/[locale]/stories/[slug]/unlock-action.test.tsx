// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { UnlockAction } from './unlock-action'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  push.mockClear()
  refresh.mockClear()
})

describe('Story unlock action', () => {
  it('reuses its key on retry and enters Reader only after confirmed entitlement', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({ outcome: 'unlocked', entitlementId: 'entitlement-1' }),
      )
    render(
      <UnlockAction
        detailPath="/en/stories/clockwork-gardens"
        storyId="story-1"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Unlock for 1 credit' }))
    await waitFor(() => {
      expect(screen.getByText(/could not confirm ownership/u)).toBeTruthy()
    })
    expect(push).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Unlock for 1 credit' }))
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/en/stories/clockwork-gardens/read')
    })
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual(
      fetchMock.mock.calls[1]?.[1]?.headers,
    )
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ storyId: 'story-1' }),
    )
  })

  it('returns to this Story for insufficient credits', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ code: 'insufficient_credits' }, { status: 409 }),
    )
    render(
      <UnlockAction
        detailPath="/en/stories/clockwork-gardens"
        storyId="story-1"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Unlock for 1 credit' }))
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(
        '/credits?return=%2Fen%2Fstories%2Fclockwork-gardens',
      )
    })
    expect(refresh).not.toHaveBeenCalled()
  })
})
