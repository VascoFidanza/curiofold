'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { Button } from '@curiofold/ui'

import styles from './story-detail.module.css'

export function DirectPurchaseAction({
  storyId,
  detailPath,
}: Readonly<{ storyId: string; detailPath: string }>) {
  const router = useRouter()
  const operationKey = useRef<string | null>(null)
  const pending = useRef(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function purchase() {
    if (pending.current) return
    pending.current = true
    setWorking(true)
    setError(null)
    operationKey.current ??= crypto.randomUUID()

    try {
      const response = await fetch('/api/v1/story-purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': operationKey.current,
        },
        body: JSON.stringify({ storyId, returnPath: detailPath }),
        cache: 'no-store',
      })

      if (response.status === 401) {
        router.push(`/sign-in?redirect_url=${encodeURIComponent(detailPath)}`)
        return
      }
      if (response.status === 403) {
        setError('Verify your email in Account before buying this Story.')
        return
      }
      if (response.status === 409) {
        const problem = (await response.json()) as { code?: string }
        if (problem.code === 'already_owned') {
          router.push(`${detailPath}/read`)
          return
        }
      }
      if (!response.ok) throw new Error('Purchase failed')
      const result = (await response.json()) as Record<string, unknown>
      if (
        typeof result.checkoutUrl !== 'string' ||
        typeof result.orderId !== 'string' ||
        result.status !== 'checkout_created'
      )
        throw new Error('Checkout confirmation was invalid')
      window.location.assign(result.checkoutUrl)
    } catch {
      setError(
        'We could not start checkout. Please try again; you will not be charged twice.',
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
        onClick={() => void purchase()}
        type="button"
      >
        {working ? 'Preparing checkout…' : 'Buy this Story for €1.30'}
      </Button>
      {error ? (
        <p aria-live="polite" className={styles.unlockError}>
          {error}
        </p>
      ) : null}
    </>
  )
}
