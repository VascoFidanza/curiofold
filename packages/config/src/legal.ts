import { z } from 'zod'

export const legalDocumentKeys = [
  'terms',
  'privacy',
  'refunds',
  'cookies',
  'business',
] as const
export type LegalDocumentKey = (typeof legalDocumentKeys)[number]
export const legalDocumentTitles: Record<LegalDocumentKey, string> = {
  terms: 'Terms and conditions',
  privacy: 'Privacy policy',
  refunds: 'Refunds and cancellations',
  cookies: 'Cookie information',
  business: 'Business and consumer information',
}

const documentSchema = z
  .strictObject({
    status: z.enum(['draft', 'approved']),
    version: z.string().trim().min(1).max(80).nullable(),
    effectiveOn: z.iso.date().nullable(),
    approvalReference: z.string().trim().min(1).max(500).nullable(),
    sections: z
      .array(
        z.strictObject({
          heading: z.string().trim().min(1).max(200),
          paragraphs: z
            .array(z.string().trim().min(1).max(12_000))
            .min(1)
            .max(30),
        }),
      )
      .max(50),
  })
  .superRefine((document, context) => {
    if (
      document.status === 'approved' &&
      (!document.version ||
        !document.effectiveOn ||
        !document.approvalReference ||
        document.sections.length === 0)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Approved policies require version, effective date, review evidence and text.',
      })
    }
  })

export const legalCatalogueSchema = z.strictObject({
  schemaVersion: z.literal(1),
  documents: z.strictObject({
    terms: documentSchema,
    privacy: documentSchema,
    refunds: documentSchema,
    cookies: documentSchema,
    business: documentSchema,
  }),
})
export type LegalCatalogue = z.infer<typeof legalCatalogueSchema>
export type LegalDocument = LegalCatalogue['documents'][LegalDocumentKey]

export function isLegalDocumentKey(value: string): value is LegalDocumentKey {
  return legalDocumentKeys.some((key) => key === value)
}

export function publishedLegalDocument(
  document: LegalDocument,
  now = new Date(),
): LegalDocument | null {
  if (
    document.status !== 'approved' ||
    !document.effectiveOn ||
    !Number.isFinite(now.getTime()) ||
    Date.parse(document.effectiveOn) > now.getTime()
  )
    return null
  return document
}

export function legalDisclosuresReady(
  catalogue: LegalCatalogue,
  now = new Date(),
): boolean {
  return legalDocumentKeys.every(
    (key) => publishedLegalDocument(catalogue.documents[key], now) !== null,
  )
}
