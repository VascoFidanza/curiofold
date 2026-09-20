import type { ButtonHTMLAttributes, ReactNode } from 'react'

import styles from './primitives.module.css'

export function CuriofoldBrand({
  showWordmark = true,
}: Readonly<{ showWordmark?: boolean }>) {
  return (
    <span className={styles.brand}>
      <span aria-hidden="true" className={styles.mark}>
        <span className={styles.fold} />
        <span className={styles.curiosityDot} />
      </span>
      {showWordmark ? <span className={styles.wordmark}>Curiofold</span> : null}
    </span>
  )
}

export function PageFrame({ children }: Readonly<{ children: ReactNode }>) {
  return <div className={styles.pageFrame}>{children}</div>
}

export function LoadingState({
  label = 'Loading Curiofold',
}: Readonly<{ label?: string }>) {
  return (
    <section aria-busy="true" aria-live="polite" className={styles.state}>
      <span className={styles.visuallyHidden}>{label}</span>
      <div aria-hidden="true" className={styles.skeleton}>
        <span className={styles.skeletonEyebrow} />
        <span className={styles.skeletonTitle} />
        <span className={styles.skeletonBody} />
        <span className={styles.skeletonBodyShort} />
      </div>
    </section>
  )
}

export function ErrorState({
  action,
  description,
  eyebrow = 'Something went wrong',
  title,
}: Readonly<{
  action?: ReactNode
  description: string
  eyebrow?: string
  title: string
}>) {
  return (
    <section className={styles.state}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.stateTitle}>{title}</h1>
      <p className={styles.stateDescription}>{description}</p>
      {action ? <div className={styles.stateAction}>{action}</div> : null}
    </section>
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
}

export function Button({
  children,
  className,
  disabled,
  loading = false,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={loading ? true : undefined}
      className={[styles.button, className]
        .filter((value) => value !== undefined)
        .join(' ')}
      disabled={loading ? true : disabled}
      type={type}
    >
      {loading ? (
        <span aria-hidden="true" className={styles.buttonSpinner} />
      ) : null}
      <span>{children}</span>
    </button>
  )
}
