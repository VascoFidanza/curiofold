import Link from 'next/link'
import { PageFrame } from '@curiofold/ui'
import type { LegalDocument } from '@curiofold/config/legal'
import { publishedLegalDocument } from '@curiofold/config/legal'

export function LegalDocumentView({
  title,
  document: source,
}: Readonly<{ title: string; document: LegalDocument | null }>) {
  const document = source ? publishedLegalDocument(source) : null
  return (
    <PageFrame>
      <h1>{title}</h1>
      {document ? (
        <>
          <p>
            Version {document.version} · Effective{' '}
            <time dateTime={document.effectiveOn ?? undefined}>
              {document.effectiveOn}
            </time>
          </p>
          {document.sections.map((section, index) => (
            <section
              key={index}
              aria-labelledby={`policy-section-${String(index)}`}
            >
              <h2 id={`policy-section-${String(index)}`}>{section.heading}</h2>
              {section.paragraphs.map((paragraph, position) => (
                <p key={position}>{paragraph}</p>
              ))}
            </section>
          ))}
        </>
      ) : (
        <>
          <h2>Not yet available</h2>
          <p>
            This document has not yet been approved and made effective. No draft
            text is presented as a final policy.
          </p>
          <p>
            Live purchases remain disabled until the required disclosures and
            launch approvals are in place.
          </p>
        </>
      )}
      <p>
        <Link href="/support">Help and support</Link> ·{' '}
        <Link href="/account">Your account</Link>
      </p>
      <p>
        <Link href="/legal">All legal and privacy information</Link>
      </p>
    </PageFrame>
  )
}
