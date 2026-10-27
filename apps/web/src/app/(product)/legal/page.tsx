import Link from 'next/link'
import { PageFrame } from '@curiofold/ui'
import {
  legalDocumentKeys,
  legalDocumentTitles,
  publishedLegalDocument,
} from '@curiofold/config/legal'
import { getLegalCatalogue } from '@/server/legal-information'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Legal and privacy information' }

export default function LegalInformationPage() {
  const catalogue = getLegalCatalogue()
  const now = new Date()
  return (
    <PageFrame>
      <h1>Legal and privacy information</h1>
      <p>
        Review the information for your account and purchases. Documents
        awaiting approval are clearly marked and are not active policies.
      </p>
      <ul>
        {legalDocumentKeys.map((key) => (
          <li key={key}>
            <Link href={`/legal/${key}`}>{legalDocumentTitles[key]}</Link>
            {' — '}
            {publishedLegalDocument(catalogue.documents[key], now)
              ? 'Published'
              : 'Not yet approved or effective'}
          </li>
        ))}
      </ul>
      <p>
        <Link href="/support">Help and support</Link>
      </p>
    </PageFrame>
  )
}
