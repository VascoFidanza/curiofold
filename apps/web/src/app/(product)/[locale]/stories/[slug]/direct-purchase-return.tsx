'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import styles from './story-detail.module.css'

type ReturnState =
  | 'checking'
  | 'processing'
  | 'fulfilled'
  | 'canceled'
  | 'delayed'
  | 'unavailable'

export function DirectPurchaseReturn({
  checkoutCanceled = false,
  detailPath,
  orderId,
  storyId,
}: Readonly<{
  checkoutCanceled?: boolean
  detailPath: string
  orderId: string
  storyId: string
}>) {
  const router = useRouter()
  const [state, setState] = useState<ReturnState>('checking')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0

    async function checkOrder() {
      try {
        const response = await fetch(`/api/v1/payment-orders/${orderId}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Order unavailable')
        const order = (await response.json()) as Record<string, unknown>
        if (
          order.orderId !== orderId ||
          order.purchaseType !== 'individual_story' ||
          order.storyId !== storyId ||
          order.amountMinor !== 130 ||
          order.currency !== 'EUR'
        )
          throw new Error('Unexpected order')
        if (order.status === 'fulfilled') {
          setState('fulfilled')
          router.refresh()
          return
        }
        if (order.status === 'canceled') {
          setState('canceled')
          return
        }
        if (order.status !== 'processing') throw new Error('Invalid status')
        attempts += 1
        if (attempts < 12) {
          setState('processing')
          timer = setTimeout(() => void checkOrder(), 5_000)
        } else {
          setState('delayed')
        }
      } catch {
        if (!controller.signal.aborted) setState('unavailable')
      }
    }

    void checkOrder()
    return () => {
      controller.abort()
      if (timer) clearTimeout(timer)
    }
  }, [orderId, retry, router, storyId])

  return (
    <div aria-live="polite" className={styles.purchaseReturn}>
      {state === 'fulfilled' ? (
        <>
          <p>
            Payment confirmed. We are checking your Story access. If it does not
            appear in your Library, please contact support.
          </p>
          <Link href={detailPath}>Check Story access</Link>
        </>
      ) : state === 'canceled' ? (
        <>
          <p>Checkout was canceled. You were not charged by this order.</p>
          <Link href={detailPath}>Choose a purchase option</Link>
        </>
      ) : (
        <>
          <p>
            {state === 'unavailable'
              ? 'We could not check your order right now. Your payment state has not changed.'
              : state === 'delayed'
                ? 'Confirmation is taking longer than expected. Please check again.'
                : checkoutCanceled
                  ? 'You returned from checkout. No Story ownership has been confirmed for this order.'
                  : 'Confirming your Story purchase…'}
          </p>
          {checkoutCanceled ? (
            <Link href={detailPath}>Choose a purchase option</Link>
          ) : null}
          {state === 'unavailable' || state === 'delayed' ? (
            <button
              onClick={() => {
                setState('checking')
                setRetry((value) => value + 1)
              }}
              type="button"
            >
              Check again
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}
