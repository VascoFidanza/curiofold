// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ReaderProgressIndicator,
  ReaderCompletionActions,
  ReaderProgressProvider,
  readingPositionAtViewportLine,
} from './reader-progress'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('Reader progress client', () => {
  it('maps a viewport reading line to a block-relative offset', () => {
    expect(
      readingPositionAtViewportLine(
        [
          { bottom: 100, id: 'opening', readingUnits: 10, top: 0 },
          { bottom: 300, id: 'middle', readingUnits: 20, top: 100 },
        ],
        200,
      ),
    ).toEqual({ blockId: 'middle', offset: 10 })
  })

  it('renders the persisted high-water value accessibly', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    render(
      <ReaderProgressProvider
        blocks={[{ id: 'opening', readingUnits: 10 }]}
        initialProgress={{
          completedAt: null,
          highWaterPercent: 42,
          lastClientSequence: 3,
          resumeBlockId: 'opening',
          resumeOffset: 4,
        }}
        locale="en"
        storyId="11111111-1111-4111-8111-111111111111"
        versionId="22222222-2222-4222-8222-222222222222"
      >
        <ReaderProgressIndicator />
      </ReaderProgressProvider>,
    )

    expect(
      screen.getByRole('progressbar', { name: 'Reading progress' }),
    ).toHaveProperty('value', 42)
    expect(screen.getByText('42% read.')).toBeTruthy()
  })

  it('offers safe next actions only after a Story is complete', () => {
    const { unmount } = render(
      <ReaderProgressProvider
        blocks={[{ id: 'opening', readingUnits: 10 }]}
        initialProgress={{
          completedAt: null,
          highWaterPercent: 100,
          lastClientSequence: 3,
          resumeBlockId: 'opening',
          resumeOffset: 10,
        }}
        locale="en"
        storyId="11111111-1111-4111-8111-111111111111"
        versionId="22222222-2222-4222-8222-222222222222"
      >
        <ReaderCompletionActions />
      </ReaderProgressProvider>,
    )

    expect(
      screen.queryByRole('heading', {
        name: 'Where should curiosity take you next?',
      }),
    ).toBeNull()

    unmount()

    render(
      <ReaderProgressProvider
        blocks={[{ id: 'opening', readingUnits: 10 }]}
        initialProgress={{
          completedAt: '2026-09-26T12:00:00.000Z',
          highWaterPercent: 100,
          lastClientSequence: 4,
          resumeBlockId: 'opening',
          resumeOffset: 10,
        }}
        locale="en"
        storyId="11111111-1111-4111-8111-111111111111"
        versionId="22222222-2222-4222-8222-222222222222"
      >
        <ReaderCompletionActions />
      </ReaderProgressProvider>,
    )

    expect(
      screen.getByRole('link', { name: 'Your Library' }).getAttribute('href'),
    ).toBe('/library')
    expect(
      screen
        .getByRole('link', { name: 'Discover Stories' })
        .getAttribute('href'),
    ).toBe('/')
  })

  it('discards malformed local retry state without sending it', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const key =
      'curiofold.reader.progress.v1.11111111-1111-4111-8111-111111111111.en'
    window.localStorage.setItem(key, '{"clientSequence":"corrupt"}')

    render(
      <ReaderProgressProvider
        blocks={[{ id: 'opening', readingUnits: 10 }]}
        initialProgress={{
          completedAt: null,
          highWaterPercent: 0,
          lastClientSequence: 0,
          resumeBlockId: null,
          resumeOffset: 0,
        }}
        locale="en"
        storyId="11111111-1111-4111-8111-111111111111"
        versionId="22222222-2222-4222-8222-222222222222"
      >
        <ReaderProgressIndicator />
      </ReaderProgressProvider>,
    )

    expect(window.localStorage.getItem(key)).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('queues a failed save and retries the same user-scoped payload online', async () => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 100,
    })
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      return window.setTimeout(() => {
        callback(0)
      }, 0)
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((timer) => {
      window.clearTimeout(timer)
    })
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      toJSON: () => ({}),
      top: 0,
      width: 100,
      x: 0,
      y: 0,
    })

    let attempts = 0
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      attempts += 1
      if (attempts === 1) {
        return Promise.reject(new TypeError('offline'))
      }
      return Promise.resolve(
        Response.json({
          accepted: true,
          progress: {
            completedAt: null,
            highWaterPercent: 40,
            lastClientSequence: 1,
            resumeBlockId: 'opening',
            resumeOffset: 4,
          },
        }),
      )
    })

    render(
      <ReaderProgressProvider
        blocks={[{ id: 'opening', readingUnits: 10 }]}
        initialProgress={{
          completedAt: null,
          highWaterPercent: 0,
          lastClientSequence: 0,
          resumeBlockId: null,
          resumeOffset: 0,
        }}
        locale="en"
        storyId="11111111-1111-4111-8111-111111111111"
        versionId="22222222-2222-4222-8222-222222222222"
      >
        <div id="block-opening">Opening</div>
        <ReaderProgressIndicator />
      </ReaderProgressProvider>,
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_100)
    })
    const key =
      'curiofold.reader.progress.v1.11111111-1111-4111-8111-111111111111.en'
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem(key)).toContain('"clientSequence":1')
    expect(
      screen.getByText('Progress will be saved when the connection returns.'),
    ).toBeTruthy()

    await act(async () => {
      window.dispatchEvent(new Event('online'))
      await vi.runAllTimersAsync()
    })

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(
      fetchMock.mock.calls.map(([, options]) => {
        if (typeof options?.body !== 'string') {
          throw new TypeError('Expected a serialized progress payload.')
        }
        return JSON.parse(options.body) as unknown
      }),
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ clientSequence: 1 })]),
    )
    expect(window.localStorage.getItem(key)).toBeNull()
    expect(screen.getByText('Progress saved.')).toBeTruthy()
  })
})
