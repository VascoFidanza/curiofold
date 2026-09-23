export interface ReadingProgressBlock {
  readonly id: string
  readonly readingUnits: number
}

export interface ReadingProgressAnchor {
  readonly blockId: string
  readonly offset: number
}

export interface ResolveReadingProgressInput {
  readonly anchor: ReadingProgressAnchor | null
  readonly completedAt: Date | null
  readonly endMarkerReached: boolean
  readonly existingHighWaterPercent: number
  readonly now: Date
  readonly sourceBlocks: readonly ReadingProgressBlock[]
  readonly targetBlocks: readonly ReadingProgressBlock[]
}

export interface ResolvedReadingProgress {
  readonly completedAt: Date | null
  readonly currentPercent: number
  readonly highWaterPercent: number
  readonly resumeAnchor: ReadingProgressAnchor | null
}

function assertBlocks(blocks: readonly ReadingProgressBlock[]): void {
  if (blocks.length === 0) {
    throw new TypeError('Reading progress requires at least one Story block.')
  }

  const identifiers = new Set<string>()
  for (const block of blocks) {
    if (!block.id || !Number.isInteger(block.readingUnits)) {
      throw new TypeError('Reading progress blocks must be well formed.')
    }
    if (block.readingUnits <= 0) {
      throw new TypeError('Reading progress units must be positive integers.')
    }
    if (identifiers.has(block.id)) {
      throw new TypeError('Reading progress block identifiers must be unique.')
    }
    identifiers.add(block.id)
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function totalUnits(blocks: readonly ReadingProgressBlock[]): number {
  return blocks.reduce((total, block) => total + block.readingUnits, 0)
}

export function readingPercentAtAnchor(
  blocks: readonly ReadingProgressBlock[],
  anchor: ReadingProgressAnchor | null,
): number {
  assertBlocks(blocks)
  if (!anchor) {
    return 0
  }

  let consumed = 0
  for (const block of blocks) {
    if (block.id === anchor.blockId) {
      const offset = Number.isFinite(anchor.offset)
        ? Math.floor(anchor.offset)
        : 0
      consumed += clamp(offset, 0, block.readingUnits)
      return Math.floor((consumed / totalUnits(blocks)) * 100)
    }
    consumed += block.readingUnits
  }

  throw new TypeError('Reading progress anchor is not part of the Story.')
}

function anchorAtPercent(
  blocks: readonly ReadingProgressBlock[],
  percent: number,
): ReadingProgressAnchor {
  const targetUnits = (clamp(percent, 0, 100) / 100) * totalUnits(blocks)
  let consumed = 0

  for (const block of blocks) {
    const blockEnd = consumed + block.readingUnits
    if (targetUnits <= blockEnd) {
      return {
        blockId: block.id,
        offset: clamp(
          Math.round(targetUnits - consumed),
          0,
          block.readingUnits,
        ),
      }
    }
    consumed = blockEnd
  }

  const finalBlock = blocks.at(-1)
  if (!finalBlock) {
    throw new TypeError('Reading progress requires at least one Story block.')
  }
  return { blockId: finalBlock.id, offset: finalBlock.readingUnits }
}

export function remapReadingAnchor(
  sourceBlocks: readonly ReadingProgressBlock[],
  targetBlocks: readonly ReadingProgressBlock[],
  anchor: ReadingProgressAnchor | null,
): ReadingProgressAnchor | null {
  assertBlocks(sourceBlocks)
  assertBlocks(targetBlocks)
  if (!anchor) {
    return null
  }

  const sourceIndex = sourceBlocks.findIndex(({ id }) => id === anchor.blockId)
  if (sourceIndex < 0) {
    throw new TypeError('Reading progress anchor is not part of the Story.')
  }

  const sourceBlock = sourceBlocks[sourceIndex]
  if (!sourceBlock) {
    throw new TypeError('Reading progress source block is unavailable.')
  }

  const directTarget = targetBlocks.find(({ id }) => id === anchor.blockId)
  if (directTarget) {
    const sourceOffset = clamp(
      Number.isFinite(anchor.offset) ? Math.floor(anchor.offset) : 0,
      0,
      sourceBlock.readingUnits,
    )
    return {
      blockId: directTarget.id,
      offset: clamp(
        Math.round(
          (sourceOffset / sourceBlock.readingUnits) * directTarget.readingUnits,
        ),
        0,
        directTarget.readingUnits,
      ),
    }
  }

  const targetIdentifiers = new Set(targetBlocks.map(({ id }) => id))
  for (let index = sourceIndex - 1; index >= 0; index -= 1) {
    const predecessor = sourceBlocks[index]
    if (predecessor && targetIdentifiers.has(predecessor.id)) {
      const targetPredecessor = targetBlocks.find(
        ({ id }) => id === predecessor.id,
      )
      if (targetPredecessor) {
        return {
          blockId: targetPredecessor.id,
          offset: targetPredecessor.readingUnits,
        }
      }
    }
  }

  return anchorAtPercent(
    targetBlocks,
    readingPercentAtAnchor(sourceBlocks, anchor),
  )
}

export function resolveReadingProgress(
  input: ResolveReadingProgressInput,
): ResolvedReadingProgress {
  if (
    !Number.isInteger(input.existingHighWaterPercent) ||
    input.existingHighWaterPercent < 0 ||
    input.existingHighWaterPercent > 100
  ) {
    throw new TypeError('Existing high-water progress must be 0–100.')
  }

  const currentPercent = readingPercentAtAnchor(
    input.sourceBlocks,
    input.anchor,
  )
  const highWaterPercent = Math.max(
    input.existingHighWaterPercent,
    currentPercent,
  )
  const completedAt =
    input.completedAt ??
    (input.endMarkerReached && highWaterPercent >= 95 ? input.now : null)

  return {
    completedAt,
    currentPercent,
    highWaterPercent,
    resumeAnchor: remapReadingAnchor(
      input.sourceBlocks,
      input.targetBlocks,
      input.anchor,
    ),
  }
}
