import Link from 'next/link'
import type { ReactNode } from 'react'

import { CuriofoldBrand } from '@curiofold/ui'

import styles from './identity-shell.module.css'

export default function IdentityLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link aria-label="Curiofold home" className={styles.brandLink} href="/">
          <CuriofoldBrand />
        </Link>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
