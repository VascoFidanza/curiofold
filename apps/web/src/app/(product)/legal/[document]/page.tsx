import { notFound } from 'next/navigation'
import {
  isLegalDocumentKey,
  legalDocumentTitles,
  publishedLegalDocument,
} from '@curiofold/config/legal'
import { getLegalCatalogue } from '@/server/legal-information'
import { LegalDocumentView } from '../legal-document'

interface Props {
  readonly params: Promise<{ document: string }>
}
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props) {
  const { document } = await params
  return {
    title: isLegalDocumentKey(document)
      ? legalDocumentTitles[document]
      : 'Legal information',
  }
}

export default async function LegalDocumentPage({ params }: Props) {
  const { document } = await params
  if (!isLegalDocumentKey(document)) notFound()
  const catalogue = getLegalCatalogue()
  return (
    <LegalDocumentView
      title={legalDocumentTitles[document]}
      document={publishedLegalDocument(catalogue.documents[document])}
    />
  )
}
