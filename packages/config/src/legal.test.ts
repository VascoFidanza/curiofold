import { describe, expect, it } from 'vitest'
import {
  isLegalDocumentKey,
  legalCatalogueSchema,
  legalDisclosuresReady,
  legalDocumentKeys,
  publishedLegalDocument,
} from './legal'

const approved = {
  status: 'approved' as const,
  version: 'test-v1',
  effectiveOn: '2026-10-01',
  approvalReference: 'synthetic-test-review-only',
  sections: [
    {
      heading: 'Test-only heading',
      paragraphs: ['Synthetic policy fixture, not approved business text.'],
    },
  ],
}
const now = new Date('2026-10-26T12:00:00Z')
const catalogue = () =>
  legalCatalogueSchema.parse({
    schemaVersion: 1,
    documents: Object.fromEntries(
      legalDocumentKeys.map((key) => [key, approved]),
    ),
  })

describe('legal publication contract', () => {
  it('allows only the fixed document routes', () => {
    expect(legalDocumentKeys.every(isLegalDocumentKey)).toBe(true)
    for (const key of ['__proto__', '../privacy', 'unknown', 'Terms'])
      expect(isLegalDocumentKey(key)).toBe(false)
  })
  it.each(['version', 'effectiveOn', 'approvalReference'])(
    'rejects approved documents missing %s',
    (key) => {
      const value = catalogue()
      expect(
        legalCatalogueSchema.safeParse({
          ...value,
          documents: {
            ...value.documents,
            terms: { ...approved, [key]: null },
          },
        }).success,
      ).toBe(false)
    },
  )
  it('rejects approved empty text and unknown schema fields', () => {
    const value = catalogue()
    expect(
      legalCatalogueSchema.safeParse({
        ...value,
        documents: { ...value.documents, terms: { ...approved, sections: [] } },
      }).success,
    ).toBe(false)
    expect(
      legalCatalogueSchema.safeParse({ ...value, arbitraryHtml: '<script>' })
        .success,
    ).toBe(false)
    expect(
      legalCatalogueSchema.safeParse({ ...value, schemaVersion: 2 }).success,
    ).toBe(false)
  })
  it('publishes only effective approved versions, never draft text', () => {
    expect(publishedLegalDocument(approved, now)).toEqual(approved)
    expect(
      publishedLegalDocument({ ...approved, status: 'draft' }, now),
    ).toBeNull()
    expect(
      publishedLegalDocument({ ...approved, effectiveOn: '2026-10-27' }, now),
    ).toBeNull()
    expect(publishedLegalDocument(approved, new Date('invalid'))).toBeNull()
    expect(
      publishedLegalDocument(approved, new Date('2026-10-01T00:00:00Z')),
    ).toEqual(approved)
  })
  it.each(legalDocumentKeys)(
    'requires the effective %s document for live disclosures',
    (key) => {
      const value = catalogue()
      expect(legalDisclosuresReady(value, now)).toBe(true)
      value.documents[key].status = 'draft'
      expect(legalDisclosuresReady(value, now)).toBe(false)
      value.documents[key] = { ...approved, effectiveOn: '2027-01-01' }
      expect(legalDisclosuresReady(value, now)).toBe(false)
    },
  )
})
