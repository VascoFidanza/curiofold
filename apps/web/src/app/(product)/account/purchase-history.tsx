import type { PurchaseHistoryItem } from '@curiofold/db'

import styles from './account.module.css'

const dateFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en', {
    currency,
    style: 'currency',
  }).format(amountMinor / 100)
}

function orderStatus(status: PurchaseHistoryItem['status']): string {
  switch (status) {
    case 'fulfilled':
      return 'Payment confirmed'
    case 'canceled':
      return 'Canceled'
    case 'pending':
    case 'checkout_created':
    case 'payment_pending':
      return 'Awaiting payment confirmation'
  }
}

function reversalStatus(
  reversal: PurchaseHistoryItem['reversals'][number],
): string {
  const kind =
    reversal.kind === 'dispute'
      ? 'Dispute'
      : reversal.kind === 'refund'
        ? 'Refund'
        : 'Adjustment'
  const status =
    reversal.status === 'manual_review'
      ? 'under review'
      : reversal.status === 'completed'
        ? 'recorded'
        : reversal.status === 'rejected' || reversal.status === 'canceled'
          ? reversal.status
          : 'pending'
  return `${kind} ${status}`
}

export function PurchaseHistory({
  purchases,
}: Readonly<{ purchases: readonly PurchaseHistoryItem[] }>) {
  return (
    <section aria-labelledby="purchases-heading" className={styles.walletCard}>
      <div>
        <p className={styles.eyebrow}>Payments</p>
        <h2 id="purchases-heading">Recent purchases</h2>
      </div>
      {purchases.length === 0 ? (
        <p>
          No purchases yet. Direct Story payments and credit top-ups will appear
          here.
        </p>
      ) : (
        <ol className={styles.purchaseList}>
          {purchases.map((purchase) => (
            <li className={styles.purchaseItem} key={purchase.id}>
              <div>
                <strong>
                  {purchase.kind === 'individual_story'
                    ? (purchase.story?.title ?? 'Story purchase')
                    : `Credit top-up · ${String(purchase.credits)} credits`}
                </strong>
                <time dateTime={purchase.createdAt.toISOString()}>
                  {dateFormatter.format(purchase.createdAt)}
                </time>
                <span>{orderStatus(purchase.status)}</span>
                {purchase.reversals.map((reversal, index) => (
                  <span key={index}>
                    {reversalStatus(reversal)} ·{' '}
                    {formatMoney(reversal.amountMinor, purchase.currency)}
                  </span>
                ))}
              </div>
              <strong>
                {formatMoney(purchase.amountMinor, purchase.currency)}
              </strong>
            </li>
          ))}
        </ol>
      )}
      <p>Payment status does not replace your Library’s ownership status.</p>
    </section>
  )
}
