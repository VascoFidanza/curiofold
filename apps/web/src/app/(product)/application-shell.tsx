import Link from 'next/link'
import type { ReactNode } from 'react'

import { CuriofoldBrand } from '@curiofold/ui'

import styles from './application-shell.module.css'

type NavigationId =
  'collections' | 'discover' | 'library' | 'progress' | 'search'

interface ApplicationShellLabels {
  account: string
  collections: string
  discover: string
  library: string
  progress: string
  search: string
  skipToContent: string
}

const defaultLabels: ApplicationShellLabels = {
  account: 'Account',
  collections: 'Collections',
  discover: 'Discover',
  library: 'Library',
  progress: 'Progress',
  search: 'Search',
  skipToContent: 'Skip to main content',
}

const desktopItems: readonly { href: string; id: NavigationId }[] = [
  { href: '/', id: 'discover' },
  { href: '/library', id: 'library' },
  { href: '/collections', id: 'collections' },
]

const mobileItems: readonly { href: string; id: NavigationId }[] = [
  { href: '/', id: 'discover' },
  { href: '/search', id: 'search' },
  { href: '/library', id: 'library' },
  { href: '/progress', id: 'progress' },
]

export function ApplicationShell({
  activeNavigation,
  children,
  labels = defaultLabels,
}: Readonly<{
  activeNavigation?: NavigationId
  children: ReactNode
  labels?: ApplicationShellLabels
}>) {
  const navigationLabel = (id: NavigationId) => labels[id]

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        {labels.skipToContent}
      </a>

      <header>
        <div className={styles.desktopHeader}>
          <div className={styles.headerInner}>
            <Link
              aria-label="Curiofold home"
              className={styles.brandLink}
              href="/"
            >
              <CuriofoldBrand />
            </Link>
            <nav aria-label="Primary navigation">
              <ul className={styles.desktopNavigation}>
                {desktopItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      aria-current={
                        activeNavigation === item.id ? 'page' : undefined
                      }
                      className={styles.navigationLink}
                      href={item.href}
                    >
                      {navigationLabel(item.id)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className={styles.headerActions}>
              <Link className={styles.actionLink} href="/search">
                {labels.search}
              </Link>
              <Link className={styles.accountLink} href="/account">
                {labels.account}
              </Link>
            </div>
          </div>
        </div>

        <div className={styles.mobileHeader}>
          <Link
            aria-label="Curiofold home"
            className={styles.brandLink}
            href="/"
          >
            <CuriofoldBrand />
          </Link>
          <Link className={styles.accountLink} href="/account">
            {labels.account}
          </Link>
        </div>
      </header>

      <main className={styles.main} id="main-content" tabIndex={-1}>
        {children}
      </main>

      <nav aria-label="Mobile navigation" className={styles.mobileNavigation}>
        <ul>
          {mobileItems.map((item) => (
            <li key={item.id}>
              <Link
                aria-current={activeNavigation === item.id ? 'page' : undefined}
                className={styles.mobileNavigationLink}
                href={item.href}
              >
                {navigationLabel(item.id)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export type { ApplicationShellLabels }
