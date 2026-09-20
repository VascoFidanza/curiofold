'use client'

import Link from 'next/link'
import { useSyncExternalStore, type ReactNode } from 'react'

import styles from './reader.module.css'

type ReaderTextSize = 'large' | 'small' | 'standard'
type ReaderWidth = 'standard' | 'wide'

interface ReaderPreferences {
  readonly textSize: ReaderTextSize
  readonly width: ReaderWidth
}

const defaultPreferences: ReaderPreferences = {
  textSize: 'standard',
  width: 'standard',
}
const preferenceStorageKey = 'curiofold.reader.preferences.v1'
const preferenceListeners = new Set<() => void>()
let clientPreferences = defaultPreferences
let clientPreferencesHydrated = false

function storedPreferences(): ReaderPreferences | null {
  try {
    const stored = window.localStorage.getItem(preferenceStorageKey)
    if (!stored) {
      return null
    }

    const candidate = JSON.parse(stored) as Partial<ReaderPreferences>
    const textSize = candidate.textSize
    const width = candidate.width
    if (
      (textSize === 'small' ||
        textSize === 'standard' ||
        textSize === 'large') &&
      (width === 'standard' || width === 'wide')
    ) {
      return { textSize, width }
    }
  } catch {
    // Storage is an optional enhancement; Reader access must not depend on it.
  }

  return null
}

function persistPreferences(preferences: ReaderPreferences): void {
  try {
    window.localStorage.setItem(
      preferenceStorageKey,
      JSON.stringify(preferences),
    )
  } catch {
    // Private browsing or storage denial must not interrupt reading.
  }
}

function preferencesSnapshot(): ReaderPreferences {
  return clientPreferences
}

function serverPreferencesSnapshot(): ReaderPreferences {
  return defaultPreferences
}

function subscribeToPreferences(listener: () => void): () => void {
  preferenceListeners.add(listener)

  if (!clientPreferencesHydrated) {
    clientPreferencesHydrated = true
    const restored = storedPreferences()
    if (restored) {
      clientPreferences = restored
      queueMicrotask(() => {
        for (const preferenceListener of preferenceListeners) {
          preferenceListener()
        }
      })
    }
  }

  function handleStorage(): void {
    clientPreferences = storedPreferences() ?? defaultPreferences
    listener()
  }

  window.addEventListener('storage', handleStorage)
  return () => {
    preferenceListeners.delete(listener)
    window.removeEventListener('storage', handleStorage)
  }
}

function updateReaderPreferences(preferences: ReaderPreferences): void {
  clientPreferences = preferences
  persistPreferences(preferences)
  for (const listener of preferenceListeners) {
    listener()
  }
}

export function ReaderFrame({
  children,
  detailHref,
  title,
}: Readonly<{
  children: ReactNode
  detailHref: string
  title: string
}>) {
  const preferences = useSyncExternalStore(
    subscribeToPreferences,
    preferencesSnapshot,
    serverPreferencesSnapshot,
  )

  return (
    <div
      className={styles.readerShell}
      data-reader-text-size={preferences.textSize}
      data-reader-width={preferences.width}
    >
      <a className={styles.skipLink} href="#story-content">
        Skip to Story
      </a>
      <header className={styles.toolbar}>
        <Link className={styles.backLink} href={detailHref} prefetch={false}>
          <span aria-hidden="true">←</span> Back
        </Link>
        <p aria-hidden="true" className={styles.toolbarTitle}>
          {title}
        </p>
        <details className={styles.settings}>
          <summary aria-label="Reading settings">Aa</summary>
          <div className={styles.settingsPanel}>
            <div aria-label="Text size" className={styles.controlGroup}>
              <p>Text size</p>
              <div>
                {(['small', 'standard', 'large'] as const).map((size) => (
                  <button
                    aria-pressed={preferences.textSize === size}
                    key={size}
                    onClick={() => {
                      updateReaderPreferences({
                        ...preferences,
                        textSize: size,
                      })
                    }}
                    type="button"
                  >
                    {size === 'small'
                      ? 'Smaller'
                      : size === 'large'
                        ? 'Larger'
                        : 'Default'}
                  </button>
                ))}
              </div>
            </div>
            <div aria-label="Reading width" className={styles.controlGroup}>
              <p>Reading width</p>
              <div>
                {(['standard', 'wide'] as const).map((width) => (
                  <button
                    aria-pressed={preferences.width === width}
                    key={width}
                    onClick={() => {
                      updateReaderPreferences({ ...preferences, width })
                    }}
                    type="button"
                  >
                    {width === 'standard' ? 'Standard' : 'Wide'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </details>
      </header>
      {children}
    </div>
  )
}
