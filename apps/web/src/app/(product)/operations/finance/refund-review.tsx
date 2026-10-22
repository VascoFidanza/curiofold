'use client'

import { useRef, useState, type SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { RefundReview } from '@curiofold/db'

import styles from '../../account/account.module.css'
import formStyles from './review.module.css'

export function RefundReviewPanel({
  reviews,
}: Readonly<{ reviews: readonly RefundReview[] }>) {
  const router = useRouter()
  const inFlight = useRef(false)
  const operationKey = useRef<string | null>(null)
  const [orderId, setOrderId] = useState('')
  const [reasonCode, setReasonCode] = useState('customer_request')
  const [pending, setPending] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [message, setMessage] = useState('')

  function resetRequest() {
    operationKey.current = null
    setAccepted(false)
    setMessage('')
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current || accepted) return
    inFlight.current = true
    setPending(true)
    setMessage('')
    operationKey.current ??= crypto.randomUUID()
    try {
      const response = await fetch('/api/internal/payment-reversals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': operationKey.current,
        },
        body: JSON.stringify({ orderId: orderId.trim(), reasonCode }),
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) {
        setMessage(
          response.status === 401 || response.status === 403
            ? 'Finance/admin access and a sign-in with both factors verified within 15 minutes are required. Verify your identity, then retry.'
            : response.status === 409
              ? 'This order is not eligible for another full refund review, or the request key conflicts. Refresh the queue before retrying.'
              : 'We could not confirm the review. Retry with the same details; the same request key will be reused.',
        )
        return
      }
      setAccepted(true)
      setMessage(
        'Review recorded. Policy approval is required. No refund was issued and no credits or ownership changed.',
      )
      router.refresh()
    } catch {
      setMessage(
        'We could not confirm the review. Retry with the same details; the same request key will be reused.',
      )
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  return (
    <>
      <section
        className={styles.walletCard}
        aria-labelledby="refund-review-heading"
      >
        <h2 id="refund-review-heading">Request a full-order refund review</h2>
        <p>
          This records a review only. Refund execution is disabled pending
          approved consumer-rights and spent-credit policies. Do not promise a
          refund from this screen.
        </p>
        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={pending} className={formStyles.fields}>
            <legend>Review details</legend>
            <label htmlFor="review-order">Payment order ID</label>
            <input
              id="review-order"
              required
              autoComplete="off"
              spellCheck={false}
              pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}"
              value={orderId}
              onChange={(event) => {
                setOrderId(event.target.value)
                resetRequest()
              }}
            />
            <label htmlFor="review-reason">Reason</label>
            <select
              id="review-reason"
              value={reasonCode}
              onChange={(event) => {
                setReasonCode(event.target.value)
                resetRequest()
              }}
            >
              <option value="customer_request">Customer request</option>
              <option value="duplicate_purchase">Duplicate purchase</option>
              <option value="payment_issue">Payment issue</option>
            </select>
            <button disabled={accepted} type="submit">
              {pending
                ? 'Recording review…'
                : accepted
                  ? 'Review recorded'
                  : 'Record refund review'}
            </button>
          </fieldset>
        </form>
        <p role="status">{message}</p>
      </section>
      <section
        className={styles.walletCard}
        aria-labelledby="review-queue-heading"
      >
        <h2 id="review-queue-heading">Latest payment reversal cases</h2>
        <p>
          The latest 50 cases are shown. Manual review requires a policy
          decision; it does not confirm a completed refund.
        </p>
        {reviews.length ? (
          <ol className={styles.purchaseList}>
            {reviews.map((review) => (
              <li key={review.id} className={styles.purchaseItem}>
                <div className={formStyles.caseDetails}>
                  <strong>
                    {new Intl.NumberFormat('en', {
                      style: 'currency',
                      currency: review.currency,
                    }).format(review.amountMinor / 100)}
                  </strong>
                  <span>Order: {review.orderId}</span>
                  <span>Case: {review.id}</span>
                  <span>Reason: {review.reasonCode.replaceAll('_', ' ')}</span>
                  <span>
                    Status:{' '}
                    {review.status === 'manual_review'
                      ? 'Manual review — policy approval required'
                      : review.status.replaceAll('_', ' ')}
                  </span>
                  <span>
                    {review.creditsRequested} credits requested for review
                  </span>
                  <time dateTime={review.createdAt}>
                    {new Date(review.createdAt)
                      .toISOString()
                      .slice(0, 16)
                      .replace('T', ' ')}{' '}
                    UTC
                  </time>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p>No payment reversal cases recorded.</p>
        )}
      </section>
    </>
  )
}
