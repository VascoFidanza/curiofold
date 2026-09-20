import {
  StoryContractError,
  type CompiledStoryDocument,
} from './story-contract'
import type { StoryBlock } from './story-schema'

interface ReaderBlockBase {
  readonly id: string
  readonly readingUnits: number
}

export type ReaderStoryBlock =
  | (ReaderBlockBase &
      Readonly<{
        kind: 'paragraph' | 'source_note'
        sourceIds: readonly string[]
        text: string
      }>)
  | (ReaderBlockBase &
      Readonly<{
        kind: 'section_heading'
        level: 2 | 3
        text: string
      }>)
  | (ReaderBlockBase &
      Readonly<{
        attribution: string | null
        kind: 'pull_quote'
        sourceIds: readonly string[]
        text: string
      }>)
  | (ReaderBlockBase &
      Readonly<{
        body: string
        kind: 'fact_box'
        sourceIds: readonly string[]
        title: string
      }>)
  | (ReaderBlockBase &
      Readonly<{
        alt: string | null
        attribution: string
        caption: string | null
        decorative: boolean
        kind: 'image'
        sourceIds: readonly string[]
      }>)
  | (ReaderBlockBase &
      Readonly<{
        kind: 'end_matter'
        links: readonly Readonly<{ href: string; label: string }>[]
        text: string
        title: string
      }>)

export interface ReaderStorySource {
  readonly accessedAt: string | null
  readonly authors: readonly string[]
  readonly doi: string | null
  readonly id: string
  readonly isbn: string | null
  readonly publishedAt: string | null
  readonly publisher: string | null
  readonly title: string
  readonly url: string | null
}

export interface ReaderStory {
  readonly blocks: readonly ReaderStoryBlock[]
  readonly categoryKeys: readonly string[]
  readonly deck: string
  readonly locale: string
  readonly methodologyNote: string
  readonly publishedAt: string
  readonly readingMinutes: number
  readonly revision: number
  readonly reviewedAt: string
  readonly slug: string
  readonly sources: readonly ReaderStorySource[]
  readonly storyKey: string
  readonly title: string
  readonly totalReadingUnits: number
  readonly updateNote: string | null
}

function projectBlock(
  block: StoryBlock,
  story: CompiledStoryDocument,
): ReaderStoryBlock {
  const base = {
    id: block.id,
    readingUnits: story.readingUnits[block.id] ?? 0,
  }

  switch (block.kind) {
    case 'paragraph':
    case 'source_note':
      return {
        ...base,
        kind: block.kind,
        sourceIds: block.sourceIds,
        text: block.text,
      }
    case 'section_heading':
      return {
        ...base,
        kind: block.kind,
        level: block.level,
        text: block.text,
      }
    case 'pull_quote':
      return {
        ...base,
        attribution: block.attribution,
        kind: block.kind,
        sourceIds: block.sourceIds,
        text: block.text,
      }
    case 'fact_box':
      return {
        ...base,
        body: block.body,
        kind: block.kind,
        sourceIds: block.sourceIds,
        title: block.title,
      }
    case 'image': {
      const media = story.document.media.find(
        (candidate) => candidate.id === block.mediaId,
      )
      if (!media) {
        throw new StoryContractError(
          `Reader image references unknown media: ${block.mediaId}`,
        )
      }

      return {
        ...base,
        alt: media.alt,
        attribution: media.attribution,
        caption: block.caption,
        decorative: media.decorative,
        kind: block.kind,
        sourceIds: block.sourceIds,
      }
    }
    case 'end_matter':
      return {
        ...base,
        kind: block.kind,
        links: block.links,
        text: block.text,
        title: block.title,
      }
  }
}

export function createReaderStory(story: CompiledStoryDocument): ReaderStory {
  const { document } = story
  if (
    document.publication.state !== 'published' &&
    document.publication.state !== 'archived'
  ) {
    throw new StoryContractError(
      'Only a published or archived Story may produce a Reader projection.',
    )
  }

  if (!document.publication.publishedAt || !document.editorial.reviewedAt) {
    throw new StoryContractError(
      'A Reader Story requires publication and review timestamps.',
    )
  }

  return {
    blocks: document.blocks.map((block) => projectBlock(block, story)),
    categoryKeys: document.metadata.categoryKeys,
    deck: document.metadata.deck,
    locale: document.locale,
    methodologyNote: document.editorial.methodologyNote,
    publishedAt: document.publication.publishedAt,
    readingMinutes: document.metadata.readingMinutes,
    revision: document.revision,
    reviewedAt: document.editorial.reviewedAt,
    slug: document.slug,
    sources: document.sources.map((source) => ({
      accessedAt: source.accessedAt,
      authors: source.authors,
      doi: source.doi,
      id: source.id,
      isbn: source.isbn,
      publishedAt: source.publishedAt,
      publisher: source.publisher,
      title: source.title,
      url: source.url,
    })),
    storyKey: document.storyKey,
    title: document.metadata.title,
    totalReadingUnits: story.totalReadingUnits,
    updateNote: document.editorial.updateNote,
  }
}
