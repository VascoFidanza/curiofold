import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { LegalDocumentView } from './legal-document'
import {
  getLegalCatalogue,
  isLiveCommerceDisclosureReady,
} from '../../../server/legal-information'
import LegalDocumentPage from './[document]/page'

vi.mock('@/server/legal-information', () => ({ getLegalCatalogue: vi.fn() }))

afterEach(() => vi.unstubAllEnvs())

it('validates the actual catalogue and refuses live commerce without a support contact', () => {
  const catalogue = getLegalCatalogue()
  expect(Object.keys(catalogue.documents)).toHaveLength(5)
  vi.stubEnv('CURIOFOLD_SUPPORT_EMAIL', '')
  expect(isLiveCommerceDisclosureReady()).toBe(false)
})
it('shows truthful missing-policy feedback and help without draft text', () => {
  const html = renderToStaticMarkup(
    <LegalDocumentView title="Privacy policy" document={null} />,
  )
  expect(html).toContain('Not yet available')
  expect(html).toContain('No draft text is presented as a final policy.')
  expect(html).toContain('href="/support"')
  expect(html).toContain('href="/account"')
  expect(html).not.toContain('Version ')
  const draft = renderToStaticMarkup(
    <LegalDocumentView
      title="Privacy policy"
      document={{
        status: 'draft',
        version: null,
        effectiveOn: null,
        approvalReference: null,
        sections: [
          {
            heading: 'Internal draft',
            paragraphs: ['Unapproved sentinel copy'],
          },
        ],
      }}
    />,
  )
  expect(draft).not.toContain('Unapproved sentinel copy')
  expect(draft).not.toContain('Internal draft')
})
it('renders versioned plain text semantically, never as executable HTML', () => {
  const html = renderToStaticMarkup(
    <LegalDocumentView
      title="Test-only document"
      document={{
        status: 'approved',
        version: 'fixture-v1',
        effectiveOn: '2026-10-01',
        approvalReference: 'internal-review-reference',
        sections: [
          {
            heading: 'Test heading',
            paragraphs: ['<script>alert(1)</script>'],
          },
        ],
      }}
    />,
  )
  expect(html).toContain('<h2 id="policy-section-0">Test heading</h2>')
  expect(html).toContain('dateTime="2026-10-01"')
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  expect(html).not.toContain('<script>')
  expect(html).not.toContain('internal-review-reference')
})
it('rejects unknown document paths instead of rendering arbitrary content', async () => {
  await expect(
    LegalDocumentPage({ params: Promise.resolve({ document: '__proto__' }) }),
  ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
})
