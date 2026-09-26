'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { Button } from '@curiofold/ui'

import styles from './story-detail.module.css'

export function UnlockAction({
  storyId,
  detailPath,
}: Readonly<{ storyId: string; detailPath: string }>) {
  const router = useRouter()
  const operationKey = useRef<string | null>(null)
  const pending = useRef(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function unlock() {
    if (pending.current) return
    pending.current = true
    setWorking(true)
    setError(null)
    operationKey.current ??= crypto.randomUUID()

    try {
      const response = await fetch('/api/v1/story-unlocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': operationKey.current,
        },
        body: JSON.stringify({ storyId }),
        cache: 'no-store',
      })

      if (response.status === 401) {
        router.push(`/sign-in?redirect_url=${encodeURIComponent(detailPath)}`)
        return
      }

      if (response.status === 403) {
        setError('Verify your email in Account before unlocking this Story.')
        return
      }

      if (response.status === 409) {
        const problem = (await response.json()) as { code?: string }
        if (problem.code === 'insufficient_credits') {
          router.push(`/credits?return=${encodeURIComponent(detailPath)}`)
          return
        }
      }

      if (!response.ok) throw new Error('Unlock failed')
      const result = (await response.json()) as Record<string, unknown>
      if (
        (result.outcome !== 'unlocked' && result.outcome !== 'already_owned') ||
        typeof result.entitlementId !== 'string'
      ) {
        throw new Error('Unlock confirmation was invalid')
      }

      router.push(`${detailPath}/read`)
      router.refresh()
    } catch {
      setError(
        'We could not confirm ownership. Please try again; you will not be charged twice.',
      )
    } finally {
      pending.current = false
      setWorking(false)
    }
  }

  return (
    <>
      <Button
        className={styles.unlockButton}
        disabled={working}
        onClick={() => void unlock()}
        type="button"
      >
        {working ? 'Unlocking…' : 'Unlock for 1 credit'}
      </Button>
      {error ? (
        <p aria-live="polite" className={styles.unlockError}>
          {error}
        </p>
      ) : null}
    </>
  )
}
