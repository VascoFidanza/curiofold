'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { readingPercentAtAnchor } from '@curiofold/domain'

import styles from './reader.module.css'

interface ProgressBlock {
  readonly id: string
  readonly readingUnits: number
}

interface InitialProgress {
  readonly completedAt: string | null
  readonly highWaterPercent: number
  readonly lastClientSequence: number
  readonly resumeBlockId: string | null
  readonly resumeOffset: number
}

interface ProgressPayload {
  readonly clientSequence: number
  readonly endMarkerReached: boolean
  readonly resumeBlockId: string
  readonly resumeOffset: number
  readonly versionId: string
}

interface ProgressResponse {
  readonly accepted: boolean
  readonly progress: InitialProgress
}

export interface BlockMeasurement extends ProgressBlock {
  readonly bottom: number
  readonly top: number
}

interface ProgressContextValue {
  readonly completed: boolean
  readonly highWaterPercent: number
  readonly saveState: 'idle' | 'retrying' | 'saved' | 'saving'
}

const ProgressContext = createContext<ProgressContextValue | null>(null)
const saveDelayMilliseconds = 4_000
const blockIdentifierPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const maximumInteger = 2_147_483_647

function isActive(signal: AbortSignal): boolean {
  return !signal.aborted
}

export function readingPositionAtViewportLine(
  blocks: readonly BlockMeasurement[],
  viewportLine: number,
): Readonly<{ blockId: string; offset: number }> | null {
  if (blocks.length === 0) {
    return null
  }

  const block =
    blocks.find(({ bottom }) => bottom >= viewportLine) ?? blocks.at(-1)
  if (!block) {
    return null
  }

  const height = Math.max(1, block.bottom - block.top)
  const ratio = Math.min(1, Math.max(0, (viewportLine - block.top) / height))
  return {
    blockId: block.id,
    offset: Math.round(ratio * block.readingUnits),
  }
}

function queuedProgressKey(storyId: string, locale: string): string {
  return `curiofold.reader.progress.v1.${storyId}.${locale}`
}

function parseProgressPayload(value: unknown): ProgressPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const candidate = value as Partial<ProgressPayload>
  if (
    !Number.isInteger(candidate.clientSequence) ||
    (candidate.clientSequence ?? 0) < 1 ||
    (candidate.clientSequence ?? 0) > maximumInteger ||
    typeof candidate.endMarkerReached !== 'boolean' ||
    typeof candidate.resumeBlockId !== 'string' ||
    !blockIdentifierPattern.test(candidate.resumeBlockId) ||
    !Number.isInteger(candidate.resumeOffset) ||
    (candidate.resumeOffset ?? -1) < 0 ||
    (candidate.resumeOffset ?? 0) > maximumInteger ||
    typeof candidate.versionId !== 'string' ||
    !uuidPattern.test(candidate.versionId)
  ) {
    return null
  }

  return candidate as ProgressPayload
}

function parseProgressResponse(value: unknown): ProgressResponse | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const candidate = value as Partial<ProgressResponse>
  const progress = candidate.progress
  if (
    typeof candidate.accepted !== 'boolean' ||
    !progress ||
    typeof progress !== 'object' ||
    !Number.isInteger(progress.highWaterPercent) ||
    progress.highWaterPercent < 0 ||
    progress.highWaterPercent > 100 ||
    !Number.isInteger(progress.lastClientSequence) ||
    progress.lastClientSequence < 0 ||
    (progress.completedAt !== null &&
      typeof progress.completedAt !== 'string') ||
    (progress.resumeBlockId !== null &&
      typeof progress.resumeBlockId !== 'string') ||
    !Number.isInteger(progress.resumeOffset) ||
    progress.resumeOffset < 0
  ) {
    return null
  }

  return candidate as ProgressResponse
}

function readQueuedProgress(key: string): ProgressPayload | null {
  try {
    const value = window.localStorage.getItem(key)
    if (!value) {
      return null
    }
    const payload = parseProgressPayload(JSON.parse(value) as unknown)
    if (!payload) {
      window.localStorage.removeItem(key)
    }
    return payload
  } catch {
    return null
  }
}

function storeQueuedProgress(key: string, payload: ProgressPayload): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // Progress still attempts a network save when storage is unavailable.
  }
}

function removeQueuedProgress(key: string, sequence: number): void {
  try {
    const stored = readQueuedProgress(key)
    if (stored?.clientSequence === sequence) {
      window.localStorage.removeItem(key)
    }
  } catch {
    // Storage is an optional retry enhancement.
  }
}

export function ReaderProgressProvider({
  blocks,
  children,
  initialProgress,
  locale,
  storyId,
  versionId,
}: Readonly<{
  blocks: readonly ProgressBlock[]
  children: ReactNode
  initialProgress: InitialProgress
  locale: string
  storyId: string
  versionId: string
}>) {
  const [highWaterPercent, setHighWaterPercent] = useState(
    initialProgress.highWaterPercent,
  )
  const [completed, setCompleted] = useState(
    Boolean(initialProgress.completedAt),
  )
  const [saveState, setSaveState] =
    useState<ProgressContextValue['saveState']>('idle')
  const sequence = useRef(initialProgress.lastClientSequence)
  const latestPayload = useRef<ProgressPayload | null>(null)
  const saveTimer = useRef<number | null>(null)
  const saveInFlight = useRef(false)
  const queueKey = queuedProgressKey(storyId, locale)
  const endpoint = `/api/v1/reading-progress/${storyId}/${locale}`

  useEffect(() => {
    const blockId = initialProgress.resumeBlockId
    if (!blockId || initialProgress.highWaterPercent === 0) {
      return
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const element = document.getElementById(`block-${blockId}`)
      if (!element) {
        return
      }

      const block = blocks.find(({ id }) => id === blockId)
      const ratio = block
        ? Math.min(
            1,
            Math.max(0, initialProgress.resumeOffset / block.readingUnits),
          )
        : 0
      const top =
        window.scrollY +
        element.getBoundingClientRect().top +
        element.getBoundingClientRect().height * ratio -
        window.innerHeight * 0.3
      window.scrollTo({ behavior: 'instant', top: Math.max(0, top) })
    })

    return () => {
      window.cancelAnimationFrame(animationFrame)
    }
  }, [blocks, initialProgress])

  useEffect(() => {
    const abortController = new AbortController()

    const save = async (payload: ProgressPayload) => {
      if (saveInFlight.current || !isActive(abortController.signal)) {
        return
      }
      saveInFlight.current = true
      setSaveState('saving')

      try {
        const response = await fetch(endpoint, {
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          method: 'PUT',
          signal: abortController.signal,
        })
        if (!response.ok) {
          throw new Error(
            `Progress save failed with ${String(response.status)}.`,
          )
        }

        const result = parseProgressResponse(await response.json())
        if (!result) {
          throw new TypeError('Progress response is invalid.')
        }
        if (isActive(abortController.signal)) {
          sequence.current = Math.max(
            sequence.current,
            result.progress.lastClientSequence,
          )
          setHighWaterPercent((previous) =>
            Math.max(previous, result.progress.highWaterPercent),
          )
          setCompleted(Boolean(result.progress.completedAt))
          setSaveState('saved')
        }
        removeQueuedProgress(queueKey, payload.clientSequence)
      } catch {
        if (isActive(abortController.signal)) {
          setSaveState('retrying')
          storeQueuedProgress(queueKey, payload)
        }
      } finally {
        saveInFlight.current = false
        if (
          isActive(abortController.signal) &&
          latestPayload.current &&
          latestPayload.current.clientSequence > payload.clientSequence
        ) {
          const pending = latestPayload.current
          window.setTimeout(() => {
            void save(pending)
          }, 0)
        }
      }
    }

    const scheduleSave = (payload: ProgressPayload) => {
      latestPayload.current = payload
      storeQueuedProgress(queueKey, payload)
      if (saveTimer.current) {
        return
      }
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null
        const pending = latestPayload.current
        if (pending) {
          void save(pending)
        }
      }, saveDelayMilliseconds)
    }

    const measure = () => {
      const measurements = blocks.flatMap((block) => {
        const element = document.getElementById(`block-${block.id}`)
        if (!element) {
          return []
        }
        const bounds = element.getBoundingClientRect()
        return [
          {
            ...block,
            bottom: bounds.bottom,
            top: bounds.top,
          },
        ]
      })
      const position = readingPositionAtViewportLine(
        measurements,
        window.innerHeight * 0.35,
      )
      if (!position) {
        return
      }

      const currentPercent = readingPercentAtAnchor(blocks, position)
      setHighWaterPercent((previous) => Math.max(previous, currentPercent))
      const endMarker = document.getElementById('story-end-marker')
      const endMarkerReached = Boolean(
        endMarker &&
        endMarker.getBoundingClientRect().top <= window.innerHeight,
      )
      sequence.current += 1
      scheduleSave({
        clientSequence: sequence.current,
        endMarkerReached,
        resumeBlockId: position.blockId,
        resumeOffset: position.offset,
        versionId,
      })
    }

    let animationFrame: number | null = null
    const scheduleMeasurement = () => {
      if (animationFrame !== null) {
        return
      }
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null
        measure()
      })
    }
    const flush = () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      const pending = latestPayload.current
      if (pending) {
        void save(pending)
      }
    }
    const retry = () => {
      const pending = readQueuedProgress(queueKey)
      if (pending) {
        latestPayload.current = pending
        sequence.current = Math.max(sequence.current, pending.clientSequence)
        void save(pending)
      }
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush()
      }
    }

    window.addEventListener('scroll', scheduleMeasurement, { passive: true })
    window.addEventListener('resize', scheduleMeasurement)
    window.addEventListener('online', retry)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', handleVisibility)
    scheduleMeasurement()
    retry()

    return () => {
      abortController.abort()
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame)
      }
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current)
      }
      window.removeEventListener('scroll', scheduleMeasurement)
      window.removeEventListener('resize', scheduleMeasurement)
      window.removeEventListener('online', retry)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [blocks, endpoint, queueKey, versionId])

  return (
    <ProgressContext.Provider
      value={{ completed, highWaterPercent, saveState }}
    >
      {children}
    </ProgressContext.Provider>
  )
}

export function ReaderProgressIndicator() {
  const progress = useContext(ProgressContext)
  if (!progress) {
    return null
  }

  const status = progress.completed
    ? 'Story completed. Progress saved.'
    : progress.saveState === 'retrying'
      ? 'Progress will be saved when the connection returns.'
      : progress.saveState === 'saving'
        ? 'Saving progress.'
        : progress.saveState === 'saved'
          ? 'Progress saved.'
          : `${String(progress.highWaterPercent)}% read.`

  return (
    <div className={styles.progressRegion}>
      <progress
        aria-label="Reading progress"
        max={100}
        value={progress.highWaterPercent}
      />
      <span aria-live="polite" className={styles.visuallyHidden}>
        {status}
      </span>
    </div>
  )
}
