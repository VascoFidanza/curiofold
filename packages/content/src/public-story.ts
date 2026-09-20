import {
  StoryContractError,
  type CompiledStoryDocument,
} from './story-contract'
import type { StoryBlock } from './story-schema'

export type PublicStoryPreviewBlock =
  | Readonly<{
      id: string
      kind: 'paragraph' | 'source_note'
      text: string
    }>
  | Readonly<{
      id: string
      kind: 'section_heading'
      level: 2 | 3
      text: string
    }>
  | Readonly<{
      attribution: string | null
      id: string
      kind: 'pull_quote'
      text: string
    }>
  | Readonly<{
      body: string
      id: string
      kind: 'fact_box'
      title: string
    }>
  | Readonly<{
      alt: string | null
      caption: string | null
      id: string
      kind: 'image'
    }>
  | Readonly<{
      id: string
      kind: 'end_matter'
      text: string
      title: string
    }>

export interface PublicStoryDetail {
  readonly categoryKeys: readonly string[]
  readonly credibility: Readonly<{
    reviewedAt: string
    sourceCount: number
  }>
  readonly deck: string
  readonly hook: string
  readonly locale: string
  readonly preview: string
  readonly previewBlocks: readonly PublicStoryPreviewBlock[]
  readonly publishedAt: string
  readonly readingMinutes: number
  readonly revision: number
  readonly slug: string
  readonly storyKey: string
  readonly title: string
  readonly updateNote: string | null
}

function projectPreviewBlock(
  block: StoryBlock,
  story: CompiledStoryDocument,
): PublicStoryPreviewBlock {
  switch (block.kind) {
    case 'paragraph':
    case 'source_note':
      return { id: block.id, kind: block.kind, text: block.text }
    case 'section_heading':
      return {
        id: block.id,
        kind: block.kind,
        level: block.level,
        text: block.text,
      }
    case 'pull_quote':
      return {
        attribution: block.attribution,
        id: block.id,
        kind: block.kind,
        text: block.text,
      }
    case 'fact_box':
      return {
        body: block.body,
        id: block.id,
        kind: block.kind,
        title: block.title,
      }
    case 'image': {
      const media = story.document.media.find(
        (candidate) => candidate.id === block.mediaId,
      )
      if (!media) {
        throw new StoryContractError(
          `Preview image references unknown media: ${block.mediaId}`,
        )
      }

      return {
        alt: media.alt,
        caption: block.caption,
        id: block.id,
        kind: block.kind,
      }
    }
    case 'end_matter':
      return {
        id: block.id,
        kind: block.kind,
        text: block.text,
        title: block.title,
      }
  }
}

export function createPublicStoryDetail(
  story: CompiledStoryDocument,
): PublicStoryDetail {
  const { document } = story
  const { publication, editorial, metadata } = document

  if (publication.state !== 'published') {
    throw new StoryContractError(
      'Only a published Story may produce a public detail projection.',
    )
  }

  if (!publication.publishedAt || !editorial.reviewedAt) {
    throw new StoryContractError(
      'A public Story requires publication and review timestamps.',
    )
  }

  const blocksById = new Map(
    document.blocks.map((block) => [block.id, block] as const),
  )
  const previewBlocks = metadata.previewBlockIds.map((blockId) => {
    const block = blocksById.get(blockId)
    if (!block) {
      throw new StoryContractError(
        `Preview references unknown block: ${blockId}`,
      )
    }

    return projectPreviewBlock(block, story)
  })

  return {
    categoryKeys: metadata.categoryKeys,
    credibility: {
      reviewedAt: editorial.reviewedAt,
      sourceCount: document.sources.length,
    },
    deck: metadata.deck,
    hook: metadata.hook,
    locale: document.locale,
    preview: metadata.preview,
    previewBlocks,
    publishedAt: publication.publishedAt,
    readingMinutes: metadata.readingMinutes,
    revision: document.revision,
    slug: document.slug,
    storyKey: document.storyKey,
    title: metadata.title,
    updateNote: editorial.updateNote,
  }
}
