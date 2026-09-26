import type { WalletHistoryPage, WalletTransactionKind } from '@curiofold/db'

import styles from './account.module.css'

function transactionLabel(kind: WalletTransactionKind): string {
  switch (kind) {
    case 'credit_added':
      return 'Credits added'
    case 'credit_adjustment':
      return 'Balance adjustment'
    case 'credit_reversal':
      return 'Credits reversed'
    case 'story_unlocked':
      return 'Story unlocked'
  }
}

export function WalletSummary({
  wallet,
}: Readonly<{ wallet: WalletHistoryPage }>) {
  const credits = wallet.balance.availableCredits

  return (
    <section aria-labelledby="wallet-heading" className={styles.walletCard}>
      <div className={styles.walletHeading}>
        <div>
          <p className={styles.eyebrow}>Wallet</p>
          <h2 id="wallet-heading">Your credits</h2>
        </div>
        <p className={styles.balance}>
          <strong>{credits}</strong> {credits === 1 ? 'credit' : 'credits'}
        </p>
      </div>
      <p>One credit unlocks one Story. Your credits do not expire.</p>
      <div className={styles.activity}>
        <h3>Recent activity</h3>
        {wallet.transactions.length === 0 ? (
          <p>
            No credit activity yet. Stories you unlock and credits you add will
            appear here.
          </p>
        ) : (
          <ol>
            {wallet.transactions.map((transaction) => (
              <li key={transaction.id}>
                <span>
                  <strong>{transactionLabel(transaction.kind)}</strong>
                  <time dateTime={transaction.occurredAt.toISOString()}>
                    {new Intl.DateTimeFormat('en', {
                      dateStyle: 'medium',
                      timeZone: 'UTC',
                    }).format(transaction.occurredAt)}
                  </time>
                </span>
                <span className={styles.creditChange}>
                  {transaction.credits > 0 ? '+' : ''}
                  {transaction.credits}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
