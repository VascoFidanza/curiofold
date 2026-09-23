import { describe, expect, it } from 'vitest'

import {
  readingPercentAtAnchor,
  remapReadingAnchor,
  resolveReadingProgress,
  type ReadingProgressBlock,
} from './reading-progress'

const original: readonly ReadingProgressBlock[] = [
  { id: 'opening', readingUnits: 10 },
  { id: 'middle', readingUnits: 20 },
  { id: 'ending', readingUnits: 10 },
]

describe('reading progress', () => {
  it('calculates weighted progress from a stable block anchor', () => {
    expect(
      readingPercentAtAnchor(original, { blockId: 'middle', offset: 10 }),
    ).toBe(50)
  })

  it('keeps high-water progress monotonic while allowing resume to move back', () => {
    const result = resolveReadingProgress({
      anchor: { blockId: 'opening', offset: 4 },
      completedAt: null,
      endMarkerReached: false,
      existingHighWaterPercent: 80,
      now: new Date('2026-09-23T10:00:00.000Z'),
      sourceBlocks: original,
      targetBlocks: original,
    })

    expect(result).toMatchObject({
      completedAt: null,
      currentPercent: 10,
      highWaterPercent: 80,
      resumeAnchor: { blockId: 'opening', offset: 4 },
    })
  })

  it('preserves proportional offset when a stable block survives a revision', () => {
    expect(
      remapReadingAnchor(
        original,
        [
          { id: 'opening', readingUnits: 20 },
          { id: 'middle', readingUnits: 40 },
          { id: 'ending', readingUnits: 20 },
        ],
        { blockId: 'middle', offset: 5 },
      ),
    ).toEqual({ blockId: 'middle', offset: 10 })
  })

  it('falls back to the nearest surviving predecessor after a correction', () => {
    expect(
      remapReadingAnchor(
        original,
        [
          { id: 'opening', readingUnits: 12 },
          { id: 'ending', readingUnits: 12 },
        ],
        { blockId: 'middle', offset: 5 },
      ),
    ).toEqual({ blockId: 'opening', offset: 12 })
  })

  it('falls back by weighted percentage when no predecessor survives', () => {
    expect(
      remapReadingAnchor(
        original,
        [
          { id: 'new-opening', readingUnits: 30 },
          { id: 'ending', readingUnits: 10 },
        ],
        { blockId: 'opening', offset: 4 },
      ),
    ).toEqual({ blockId: 'new-opening', offset: 4 })
  })

  it('requires both the end marker and 95 percent high-water to complete', () => {
    const now = new Date('2026-09-23T10:00:00.000Z')
    const incomplete = resolveReadingProgress({
      anchor: { blockId: 'ending', offset: 7 },
      completedAt: null,
      endMarkerReached: true,
      existingHighWaterPercent: 0,
      now,
      sourceBlocks: original,
      targetBlocks: original,
    })
    const complete = resolveReadingProgress({
      anchor: { blockId: 'ending', offset: 8 },
      completedAt: null,
      endMarkerReached: true,
      existingHighWaterPercent: 95,
      now,
      sourceBlocks: original,
      targetBlocks: original,
    })

    expect(incomplete.completedAt).toBeNull()
    expect(complete.completedAt).toEqual(now)
  })

  it('never removes an existing completion timestamp', () => {
    const completedAt = new Date('2026-09-22T09:00:00.000Z')
    expect(
      resolveReadingProgress({
        anchor: { blockId: 'opening', offset: 1 },
        completedAt,
        endMarkerReached: false,
        existingHighWaterPercent: 100,
        now: new Date('2026-09-23T10:00:00.000Z'),
        sourceBlocks: original,
        targetBlocks: original,
      }).completedAt,
    ).toEqual(completedAt)
  })
})
