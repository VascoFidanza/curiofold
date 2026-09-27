'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { quoteCreditTopUp } from '@curiofold/domain'

import styles from './credits.module.css'

const amounts = [5, 10, 20] as const

type OrderState =
  | {
      status: 'canceled' | 'checking' | 'delayed' | 'processing' | 'unavailable'
    }
  | { credits: number; status: 'fulfilled' }

function trustedCheckoutUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'checkout.stripe.com'
      ? url.toString()
      : null
  } catch {
    return null
  }
}

function PaymentReturn({
  orderId,
  returnPath,
}: Readonly<{ orderId: string; returnPath: string }>) {
  const [state, setState] = useState<OrderState>({ status: 'checking' })
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | null = null
    let attempts = 0

    async function checkOrder() {
      try {
        const response = await fetch(`/api/v1/payment-orders/${orderId}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Order status unavailable')
        const order = (await response.json()) as Record<string, unknown>
        if (order.orderId !== orderId) throw new Error('Unexpected order')
        if (order.status === 'fulfilled') {
          if (!Number.isSafeInteger(order.credits) || Number(order.credits) < 1)
            throw new Error('Invalid credit quantity')
          setState({ credits: Number(order.credits), status: 'fulfilled' })
          return
        }
        if (order.status === 'canceled') {
          setState({ status: 'canceled' })
          return
        }
        if (order.status !== 'processing')
          throw new Error('Invalid order status')

        attempts += 1
        if (attempts < 12) {
          setState({ status: 'processing' })
          timer = setTimeout(() => void checkOrder(), 5_000)
        } else {
          setState({ status: 'delayed' })
        }
      } catch {
        if (!controller.signal.aborted) setState({ status: 'unavailable' })
      }
    }

    void checkOrder()
    return () => {
      controller.abort()
      if (timer) clearTimeout(timer)
    }
  }, [orderId, retry])

  return (
    <section aria-live="polite" className={styles.returnCard}>
      {state.status === 'fulfilled' ? (
        <>
          <p className={styles.eyebrow}>Payment confirmed</p>
          <h2>{state.credits} credits added</h2>
          <p>Your credits are ready to unlock Stories.</p>
          <Link href={returnPath}>
            {returnPath.includes('/stories/')
              ? 'Return to your Story'
              : returnPath === '/account'
                ? 'View your Account'
                : 'Continue browsing'}
          </Link>
        </>
      ) : state.status === 'canceled' ? (
        <>
          <h2>Checkout was canceled</h2>
          <p>This order did not add credits.</p>
          <Link href="/credits">Try again</Link>
        </>
      ) : (
        <>
          <h2>Confirming your payment</h2>
          <p>
            {state.status === 'unavailable'
              ? 'We could not check your order right now. Your payment state is unchanged.'
              : state.status === 'delayed'
                ? 'Confirmation is taking longer than expected. You can check again safely.'
                : 'Your balance will update after the payment is confirmed.'}
          </p>
          {state.status === 'unavailable' || state.status === 'delayed' ? (
            <button
              onClick={() => {
                setState({ status: 'checking' })
                setRetry((value) => value + 1)
              }}
              type="button"
            >
              Check again
            </button>
          ) : null}
        </>
      )}
    </section>
  )
}

export function CreditsPurchase({
  orderId,
  returnPath,
}: Readonly<{ orderId: string | null; returnPath: string }>) {
  const [amountInput, setAmountInput] = useState('5')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const operationKey = useRef<string | null>(null)
  const pending = useRef(false)
  const amountEUR = /^\d+$/u.test(amountInput) ? Number(amountInput) : NaN
  const validAmount =
    Number.isSafeInteger(amountEUR) &&
    amountEUR >= 5 &&
    Number.isSafeInteger(amountEUR * 100)
  const quote = validAmount ? quoteCreditTopUp(amountEUR * 100) : null

  function changeAmount(value: string) {
    setAmountInput(value)
    operationKey.current = null
    setError(null)
  }

  async function startCheckout() {
    if (pending.current || !quote) return
    pending.current = true
    setSubmitting(true)
    setError(null)
    operationKey.current ??= crypto.randomUUID()

    try {
      const response = await fetch('/api/v1/credit-checkouts', {
        body: JSON.stringify({
          amountEUR,
          returnPath: `/credits?return=${encodeURIComponent(returnPath)}`,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': operationKey.current,
        },
        method: 'POST',
      })
      if (!response.ok) {
        setError(
          response.status === 403
            ? 'Verify your email in Account before adding credits.'
            : 'Checkout could not start. Please try again.',
        )
        return
      }
      const checkout = (await response.json()) as Record<string, unknown>
      const url = trustedCheckoutUrl(checkout.checkoutUrl)
      if (!url) throw new Error('Invalid checkout destination')
      window.location.assign(url)
    } catch {
      setError('Checkout could not start. Please try again.')
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Credits</p>
        <h1>Add credits</h1>
        <p>One credit unlocks one Story. Your credits do not expire.</p>
      </header>

      {orderId ? (
        <PaymentReturn orderId={orderId} returnPath={returnPath} />
      ) : (
        <section aria-labelledby="amount-heading" className={styles.purchase}>
          <h2 id="amount-heading">Choose your top-up</h2>
          <div className={styles.amounts}>
            {amounts.map((amount) => {
              const quote = quoteCreditTopUp(amount * 100)
              return (
                <button
                  aria-pressed={amountInput === String(amount)}
                  className={styles.amount}
                  disabled={submitting}
                  key={amount}
                  onClick={() => {
                    changeAmount(String(amount))
                  }}
                  type="button"
                >
                  <strong>€{amount}</strong>
                  <span>{quote.totalCredits} credits</span>
                  {quote.bonusCredits > 0 ? (
                    <small>Includes {quote.bonusCredits} bonus credits</small>
                  ) : null}
                </button>
              )
            })}
          </div>
          <label className={styles.customAmount} htmlFor="top-up-amount">
            Custom amount in whole euros
            <span className={styles.amountInput}>
              <span aria-hidden="true">€</span>
              <input
                aria-describedby="top-up-hint"
                aria-invalid={!quote}
                disabled={submitting}
                id="top-up-amount"
                inputMode="numeric"
                onChange={(event) => {
                  changeAmount(event.target.value)
                }}
                pattern="[0-9]*"
                type="text"
                value={amountInput}
              />
            </span>
          </label>
          <p id="top-up-hint">Enter any whole-euro amount of at least €5.</p>
          {quote ? (
            <dl aria-live="polite" className={styles.quote}>
              <div>
                <dt>Top up</dt>
                <dd>€{quote.amountEUR}</dd>
              </div>
              <div>
                <dt>Base credits</dt>
                <dd>{quote.baseCredits}</dd>
              </div>
              <div>
                <dt>Bonus rate</dt>
                <dd>+{quote.bonusRateBps / 100}%</dd>
              </div>
              <div>
                <dt>Bonus credits</dt>
                <dd>+{quote.bonusCredits}</dd>
              </div>
              <div>
                <dt>You receive</dt>
                <dd>{quote.totalCredits} credits</dd>
              </div>
            </dl>
          ) : (
            <p role="alert">Enter a whole-euro amount of at least €5.</p>
          )}
          <button
            className={styles.checkoutButton}
            disabled={submitting || !quote}
            onClick={() => void startCheckout()}
            type="button"
          >
            {submitting ? 'Opening secure checkout…' : 'Continue to payment'}
          </button>
          {error ? <p role="alert">{error}</p> : null}
          <p>
            Payment is handled by Stripe. Credits are added only after
            confirmation.
          </p>
        </section>
      )}
    </div>
  )
}
