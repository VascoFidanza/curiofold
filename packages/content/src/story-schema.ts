import { z } from 'zod'

export const currentStoryDocumentSchema = 'story-document/v1' as const

const identifierSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/)

const localeSchema = z
  .string()
  .min(2)
  .max(35)
  .regex(/^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2}|-[0-9]{3})?$/)

const nonEmptyTextSchema = z.string().trim().min(1)
const sourceIdsSchema = z.array(identifierSchema).max(50).default([])
const requiredSourceIdsSchema = z.array(identifierSchema).min(1).max(50)
const httpsUrlSchema = z.url().refine(
  (value) => {
    try {
      return new URL(value).protocol === 'https:'
    } catch {
      return false
    }
  },
  { message: 'Only HTTPS URLs are allowed.' },
)

const linkSchema = z
  .object({
    href: httpsUrlSchema,
    label: nonEmptyTextSchema.max(160),
  })
  .strict()

const paragraphBlockSchema = z
  .object({
    id: identifierSchema,
    kind: z.literal('paragraph'),
    text: nonEmptyTextSchema.max(10_000),
    sourceIds: sourceIdsSchema,
  })
  .strict()

const sectionHeadingBlockSchema = z
  .object({
    id: identifierSchema,
    kind: z.literal('section_heading'),
    level: z.union([z.literal(2), z.literal(3)]),
    text: nonEmptyTextSchema.max(240),
  })
  .strict()

const pullQuoteBlockSchema = z
  .object({
    attribution: nonEmptyTextSchema.max(240).nullable().default(null),
    id: identifierSchema,
    kind: z.literal('pull_quote'),
    sourceIds: requiredSourceIdsSchema,
    text: nonEmptyTextSchema.max(1_000),
  })
  .strict()

const factBoxBlockSchema = z
  .object({
    body: nonEmptyTextSchema.max(3_000),
    id: identifierSchema,
    kind: z.literal('fact_box'),
    sourceIds: requiredSourceIdsSchema,
    title: nonEmptyTextSchema.max(160),
  })
  .strict()

const imageBlockSchema = z
  .object({
    caption: nonEmptyTextSchema.max(500).nullable().default(null),
    id: identifierSchema,
    kind: z.literal('image'),
    mediaId: identifierSchema,
    sourceIds: sourceIdsSchema,
  })
  .strict()

const sourceNoteBlockSchema = z
  .object({
    id: identifierSchema,
    kind: z.literal('source_note'),
    sourceIds: requiredSourceIdsSchema,
    text: nonEmptyTextSchema.max(2_000),
  })
  .strict()

const endMatterBlockSchema = z
  .object({
    id: identifierSchema,
    kind: z.literal('end_matter'),
    links: z.array(linkSchema).max(20).default([]),
    text: nonEmptyTextSchema.max(5_000),
    title: nonEmptyTextSchema.max(160),
  })
  .strict()

export const storyBlockSchema = z.discriminatedUnion('kind', [
  paragraphBlockSchema,
  sectionHeadingBlockSchema,
  pullQuoteBlockSchema,
  factBoxBlockSchema,
  imageBlockSchema,
  sourceNoteBlockSchema,
  endMatterBlockSchema,
])

const sourceSchema = z
  .object({
    accessedAt: z.iso.date().nullable().default(null),
    authors: z.array(nonEmptyTextSchema.max(200)).max(30).default([]),
    doi: z.string().trim().min(1).max(200).nullable().default(null),
    id: identifierSchema,
    isbn: z.string().trim().min(1).max(32).nullable().default(null),
    publisher: nonEmptyTextSchema.max(240).nullable().default(null),
    publishedAt: z.iso.date().nullable().default(null),
    title: nonEmptyTextSchema.max(500),
    url: httpsUrlSchema.nullable().default(null),
  })
  .strict()
  .superRefine((source, context) => {
    if (!source.url && !source.doi && !source.isbn) {
      context.addIssue({
        code: 'custom',
        message: 'A source requires at least one URL, DOI, or ISBN.',
      })
    }

    if (source.url && !source.accessedAt) {
      context.addIssue({
        code: 'custom',
        message: 'URL sources require an accessedAt date.',
        path: ['accessedAt'],
      })
    }
  })

const mediaSchema = z
  .object({
    alt: z.string().trim().max(500).nullable(),
    attribution: nonEmptyTextSchema.max(500),
    decorative: z.boolean().default(false),
    id: identifierSchema,
    kind: z.enum(['image', 'diagram']),
    objectKey: nonEmptyTextSchema.max(500),
    rightsBasis: nonEmptyTextSchema.max(500),
    rightsReference: httpsUrlSchema.nullable().default(null),
  })
  .strict()
  .superRefine((media, context) => {
    if (media.decorative && media.alt !== null && media.alt !== '') {
      context.addIssue({
        code: 'custom',
        message: 'Decorative media must have null or empty alt text.',
        path: ['alt'],
      })
    }

    if (!media.decorative && !media.alt) {
      context.addIssue({
        code: 'custom',
        message: 'Informative media requires alt text.',
        path: ['alt'],
      })
    }
  })

const publicationSchema = z
  .object({
    archivedAt: z.iso.datetime({ offset: true }).nullable().default(null),
    publishedAt: z.iso.datetime({ offset: true }).nullable().default(null),
    state: z.enum(['draft', 'published', 'archived', 'withdrawn']),
    withdrawalReason: nonEmptyTextSchema.max(1_000).nullable().default(null),
  })
  .strict()

const editorialSchema = z
  .object({
    aiAssisted: z.boolean(),
    methodologyNote: nonEmptyTextSchema.max(3_000),
    reviewedAt: z.iso.datetime({ offset: true }).nullable().default(null),
    reviewedBy: nonEmptyTextSchema.max(240).nullable().default(null),
    sourceLocale: localeSchema,
    updateNote: nonEmptyTextSchema.max(1_000).nullable().default(null),
  })
  .strict()

const metadataSchema = z
  .object({
    categoryKeys: z.array(identifierSchema).min(1).max(20),
    collectionKeys: z.array(identifierSchema).max(20).default([]),
    deck: nonEmptyTextSchema.max(300),
    hook: nonEmptyTextSchema.max(500),
    preview: nonEmptyTextSchema.max(1_500),
    previewBlockIds: z.array(identifierSchema).max(10).default([]),
    readingMinutes: z.number().int().min(1).max(120),
    relatedStoryKeys: z.array(identifierSchema).max(20).default([]),
    title: nonEmptyTextSchema.max(200),
  })
  .strict()

export const storyDocumentSchema = z
  .object({
    blocks: z.array(storyBlockSchema).min(1).max(500),
    editorial: editorialSchema,
    locale: localeSchema,
    media: z.array(mediaSchema).max(100).default([]),
    metadata: metadataSchema,
    previousRevision: z.number().int().positive().nullable(),
    publication: publicationSchema,
    revision: z.number().int().positive(),
    schemaVersion: z.literal(currentStoryDocumentSchema),
    slug: identifierSchema,
    sources: z.array(sourceSchema).min(1).max(500),
    storyKey: identifierSchema,
  })
  .strict()
  .superRefine((document, context) => {
    const { publication, editorial, revision, previousRevision } = document
    const released = publication.state !== 'draft'

    if (revision === 1 && previousRevision !== null) {
      context.addIssue({
        code: 'custom',
        message: 'The first revision cannot reference a previous revision.',
        path: ['previousRevision'],
      })
    }

    if (
      revision > 1 &&
      (previousRevision === null || previousRevision >= revision)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Later revisions require a lower previousRevision.',
        path: ['previousRevision'],
      })
    }

    if (
      released &&
      (!publication.publishedAt ||
        !editorial.reviewedBy ||
        !editorial.reviewedAt)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Released Stories require publication and accountable human review metadata.',
        path: ['publication'],
      })
    }

    if (
      publication.state === 'draft' &&
      (publication.publishedAt || publication.archivedAt)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Draft Stories cannot contain release timestamps.',
        path: ['publication'],
      })
    }

    if (publication.state === 'archived' && !publication.archivedAt) {
      context.addIssue({
        code: 'custom',
        message: 'Archived Stories require archivedAt.',
        path: ['publication', 'archivedAt'],
      })
    }

    if (publication.state === 'withdrawn' && !publication.withdrawalReason) {
      context.addIssue({
        code: 'custom',
        message: 'Withdrawn Stories require a reason.',
        path: ['publication', 'withdrawalReason'],
      })
    }

    if (publication.state !== 'withdrawn' && publication.withdrawalReason) {
      context.addIssue({
        code: 'custom',
        message: 'Only withdrawn Stories may contain a withdrawal reason.',
        path: ['publication', 'withdrawalReason'],
      })
    }
  })

export type StoryBlock = z.infer<typeof storyBlockSchema>
export type StoryDocument = z.infer<typeof storyDocumentSchema>
export type StoryLocale = z.infer<typeof localeSchema>
