import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { ErrorState } from '@curiofold/ui'

import { resolveReaderAccess } from '@/server/reader-access'

import styles from './reader.module.css'
import { StoryReader } from './story-reader'

interface ReaderPageProps {
  readonly params: Promise<{
    locale: string
    slug: string
  }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'Reader',
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { locale, slug } = await params
  const detailPath = `/${locale}/stories/${slug}`
  const readerPath = `${detailPath}/read`

  const route = await resolveReaderAccess(locale, slug)
  if (route.status === 'unauthenticated') {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(readerPath)}`)
  }
  if (route.status === 'forbidden') {
    notFound()
  }
  if (
    route.status === 'identity_unavailable' ||
    route.status === 'account_disabled'
  ) {
    return (
      <main className={styles.accessState}>
        <ErrorState
          description={
            route.status === 'account_disabled'
              ? 'This account cannot access protected Curiofold Stories.'
              : 'This environment has no identity provider connected. Public Story previews remain available.'
          }
          eyebrow={
            route.status === 'account_disabled'
              ? 'Access denied'
              : 'Reader unavailable'
          }
          title={
            route.status === 'account_disabled'
              ? 'Account access is disabled.'
              : 'The Reader is not configured here.'
          }
        />
        <Link href={detailPath}>Return to Story details</Link>
      </main>
    )
  }
  if (route.status === 'not_found') {
    notFound()
  }
  if (route.status === 'not_entitled') {
    redirect(detailPath)
  }
  if (route.status === 'missing_locale') {
    return (
      <main className={styles.accessState}>
        <ErrorState
          description="Choose an available language. Curiofold never silently substitutes a different translation."
          eyebrow="Language unavailable"
          title={`This Story is not available in ${locale} yet.`}
        />
        <ul>
          {route.availableLocalizations.map((localization) => (
            <li key={localization.locale}>
              <Link
                href={`/${localization.locale}/stories/${localization.slug}/read`}
                prefetch={false}
              >
                Read in {localization.locale}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    )
  }

  return <StoryReader story={route.story} />
}
