import { createHash } from 'node:crypto'

import {
  storyDocumentSchema,
  type StoryBlock,
  type StoryDocument,
} from './story-schema.js'

export class StoryContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StoryContractError'
  }
}

export interface CompiledStoryDocument {
  contentHash: string
  document: StoryDocument
  readingUnits: Readonly<Record<string, number>>
  totalReadingUnits: number
}

export type PublishedStoryResolution =
  | {
      status: 'found'
      story: CompiledStoryDocument
    }
  | {
      availableLocales: readonly string[]
      status: 'missing_locale'
    }
  | {
      status: 'not_found'
    }

function assertUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>()

  for (const value of values) {
    if (seen.has(value)) {
      throw new StoryContractError(`Duplicate ${label}: ${value}`)
    }

    seen.add(value)
  }
}

function sourceIdsForBlock(block: StoryBlock): readonly string[] {
  switch (block.kind) {
    case 'paragraph':
    case 'pull_quote':
    case 'fact_box':
    case 'image':
    case 'source_note':
      return block.sourceIds
    case 'section_heading':
    case 'end_matter':
      return []
  }
}

function textForBlock(block: StoryBlock): string {
  switch (block.kind) {
    case 'paragraph':
    case 'pull_quote':
    case 'source_note':
      return block.text
    case 'section_heading':
      return block.text
    case 'fact_box':
      return `${block.title} ${block.body}`
    case 'image':
      return block.caption ?? ''
    case 'end_matter':
      return `${block.title} ${block.text}`
  }
}

function readingUnitsForBlock(block: StoryBlock): number {
  const wordCount = textForBlock(block)
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length

  if (block.kind === 'image') {
    return Math.max(12, wordCount)
  }

  if (block.kind === 'section_heading') {
    return Math.max(4, wordCount)
  }

  return Math.max(1, wordCount)
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value)
    return encoded
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${canonicalJson(entryValue)}`,
    )

  return `{${entries.join(',')}}`
}

export function compileStoryDocument(input: unknown): CompiledStoryDocument {
  const document = storyDocumentSchema.parse(input)
  const blockIds = document.blocks.map((block) => block.id)
  const sourceIds = document.sources.map((source) => source.id)
  const mediaIds = document.media.map((media) => media.id)

  assertUnique(blockIds, 'block id')
  assertUnique(sourceIds, 'source id')
  assertUnique(mediaIds, 'media id')

  const knownBlockIds = new Set(blockIds)
  const knownSourceIds = new Set(sourceIds)
  const knownMediaIds = new Set(mediaIds)

  for (const previewBlockId of document.metadata.previewBlockIds) {
    if (!knownBlockIds.has(previewBlockId)) {
      throw new StoryContractError(
        `Preview references unknown block: ${previewBlockId}`,
      )
    }
  }

  for (const block of document.blocks) {
    for (const sourceId of sourceIdsForBlock(block)) {
      if (!knownSourceIds.has(sourceId)) {
        throw new StoryContractError(
          `Block ${block.id} references unknown source: ${sourceId}`,
        )
      }
    }

    if (block.kind === 'image' && !knownMediaIds.has(block.mediaId)) {
      throw new StoryContractError(
        `Block ${block.id} references unknown media: ${block.mediaId}`,
      )
    }
  }

  const readingUnits = Object.fromEntries(
    document.blocks.map((block) => [block.id, readingUnitsForBlock(block)]),
  )
  const totalReadingUnits = Object.values(readingUnits).reduce(
    (total, value) => total + value,
    0,
  )
  const contentHash = createHash('sha256')
    .update(canonicalJson(document))
    .digest('hex')

  return {
    contentHash,
    document,
    readingUnits,
    totalReadingUnits,
  }
}

export function resolvePublishedStory(
  documents: readonly CompiledStoryDocument[],
  storyKey: string,
  locale: string,
): PublishedStoryResolution {
  const publishedForStory = documents.filter(
    ({ document }) =>
      document.storyKey === storyKey &&
      document.publication.state === 'published',
  )

  if (publishedForStory.length === 0) {
    return { status: 'not_found' }
  }

  const localized = publishedForStory
    .filter(({ document }) => document.locale === locale)
    .sort((left, right) => right.document.revision - left.document.revision)

  if (localized[0]) {
    return { status: 'found', story: localized[0] }
  }

  return {
    availableLocales: [
      ...new Set(publishedForStory.map(({ document }) => document.locale)),
    ].sort(),
    status: 'missing_locale',
  }
}
