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
        userId="reader-one"
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
        userId="reader-one"
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
        userId="reader-one"
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
        <ReaderCompletionActions
          relatedStories={[
            {
              basis: 'editorial',
              hook: 'A second reviewed rabbit hole.',
              locale: 'en',
              slug: 'next-garden',
              title: 'The Next Garden',
            },
          ]}
        />
      </ReaderProgressProvider>,
    )

    expect(
      screen.getByRole('link', { name: 'Your Library' }).getAttribute('href'),
    ).toBe('/library')
    expect(
      screen.getByRole('heading', { name: 'For your next rabbit hole' }),
    ).toBeTruthy()
    expect(screen.getByText('The Next Garden')).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: 'Explore this Story' })
        .getAttribute('href'),
    ).toBe('/en/stories/next-garden')
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
      'curiofold.reader.progress.v2.reader-one.11111111-1111-4111-8111-111111111111.en'
    window.localStorage.setItem(key, '{"clientSequence":"corrupt"}')

    render(
      <ReaderProgressProvider
        userId="reader-one"
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

  it.each([
    'curiofold.reader.progress.v1.11111111-1111-4111-8111-111111111111.en',
    'curiofold.reader.progress.v2.reader-two.11111111-1111-4111-8111-111111111111.en',
  ])('never replays an unowned retry queue: %s', (key) => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const payload = JSON.stringify({
      clientSequence: 50,
      endMarkerReached: true,
      resumeBlockId: 'opening',
      resumeOffset: 10,
      versionId: '22222222-2222-4222-8222-222222222222',
    })
    window.localStorage.setItem(key, payload)

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
        userId="reader-one"
        versionId="22222222-2222-4222-8222-222222222222"
      >
        <ReaderProgressIndicator />
      </ReaderProgressProvider>,
    )

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(key)).toBe(payload)
    expect(screen.getByText('0% read.')).toBeTruthy()
  })

  it.each([
    { status: 500, recover: true, unmount: false, attempts: 2 },
    { status: 429, recover: false, unmount: false, attempts: 4 },
    { status: 503, recover: false, unmount: false, attempts: 4 },
    { status: 401, recover: false, unmount: false, attempts: 1 },
    { status: 403, recover: false, unmount: false, attempts: 1 },
    { status: 400, recover: false, unmount: false, attempts: 1 },
    { status: 500, recover: false, unmount: true, attempts: 1 },
  ])(
    'bounds retries and respects permanent failures/cleanup: %j',
    async (testCase) => {
      vi.useFakeTimers()
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
      const key =
        'curiofold.reader.progress.v2.reader-one.11111111-1111-4111-8111-111111111111.en'
      const payload = {
        clientSequence: 1,
        endMarkerReached: false,
        resumeBlockId: 'opening',
        resumeOffset: 4,
        versionId: '22222222-2222-4222-8222-222222222222',
      }
      window.localStorage.setItem(key, JSON.stringify(payload))
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response(null, { status: testCase.status }))
      if (testCase.recover) {
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }))
        fetchMock.mockResolvedValue(
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
      }
      const view = render(
        <ReaderProgressProvider
          userId="reader-one"
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
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_999)
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      if (testCase.unmount) view.unmount()
      await act(async () => {
        await vi.runAllTimersAsync()
      })
      expect(fetchMock).toHaveBeenCalledTimes(testCase.attempts)
      expect(window.localStorage.getItem(key)).toBe(
        testCase.recover ? null : JSON.stringify(payload),
      )
      if (testCase.recover) {
        expect(screen.getByText('Progress saved.')).toBeTruthy()
      }
    },
  )

  it('preserves newer queued progress when an older save fails and retries online', async () => {
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
    let rejectFirstSave: (reason: Error) => void = () => {
      throw new Error('The first save has not started.')
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      attempts += 1
      if (attempts === 1) {
        return new Promise<Response>((_resolve, reject) => {
          rejectFirstSave = reject
        })
      }
      if (attempts === 2) {
        return Promise.reject(new TypeError('offline'))
      }
      return Promise.resolve(
        Response.json({
          accepted: true,
          progress: {
            completedAt: null,
            highWaterPercent: 40,
            lastClientSequence: 2,
            resumeBlockId: 'opening',
            resumeOffset: 4,
          },
        }),
      )
    })

    render(
      <ReaderProgressProvider
        userId="reader-one"
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
      'curiofold.reader.progress.v2.reader-one.11111111-1111-4111-8111-111111111111.en'
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem(key)).toContain('"clientSequence":1')

    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(window.localStorage.getItem(key)).toContain('"clientSequence":2')

    const storageWrites = vi.spyOn(Storage.prototype, 'setItem')
    await act(async () => {
      rejectFirstSave(new TypeError('offline'))
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(
      storageWrites.mock.calls.every(([, value]) => {
        const payload = JSON.parse(value) as { clientSequence: number }
        return payload.clientSequence >= 2
      }),
    ).toBe(true)
    expect(window.localStorage.getItem(key)).toContain('"clientSequence":2')
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
      expect.arrayContaining([expect.objectContaining({ clientSequence: 2 })]),
    )
    expect(window.localStorage.getItem(key)).toBeNull()
    expect(screen.getByText('Progress saved.')).toBeTruthy()
  })
})
