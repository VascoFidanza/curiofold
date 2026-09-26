/** Narrow transaction contract used by repositories without exposing a global client. */
export interface TransactionScope {
  readonly id: string
}

export { createDatabase } from './client'
export {
  assertNonProductionSeedEnvironment,
  DevelopmentSeedConflictError,
  seedDevelopmentCatalog,
  type DevelopmentSeedDocument,
  type DevelopmentSeedResult,
} from './development-seed'
export {
  findEntitledStoryBySlug,
  grantStoryEntitlement,
  revokeStoryEntitlement,
  type EntitledStoryRouteResolution,
  type GrantStoryEntitlementInput,
  type GrantStoryEntitlementResult,
  type RevokeStoryEntitlementInput,
  type RevokeStoryEntitlementResult,
} from './entitlements'
export {
  findOwnedStoryState,
  listLibraryStories,
  type LibraryStory,
  type LibraryStoryState,
} from './library'
export {
  applyIdentityLifecycleEvent,
  ensureIdentityAccount,
  findIdentityAccount,
  type IdentityAccount,
  type IdentityLifecycleEvent,
  type IdentityLifecycleResult,
} from './identity'
export {
  findPublishedStory,
  findPublishedStoryBySlug,
  isPublishedStory,
  listPublishedStories,
  searchPublishedStories,
  type PublishedStoryLocalization,
  type PublishedStoryRouteResolution,
  type PublishedStorySearchResult,
} from './published-stories'
export {
  processProviderEvent,
  ProviderEventConflictError,
  ProviderEventRetryableError,
  recordProviderEvent,
  type ProcessProviderEventInput,
  type ProcessProviderEventResult,
  type RecordedProviderEvent,
  type RecordProviderEventInput,
} from './payment-events'
export {
  attachPaymentCheckoutSession,
  createPaymentOrder,
  findPaymentOrderById,
  findPaymentOrderForUser,
  PaymentOrderConflictError,
  type AttachPaymentCheckoutInput,
  type CreatePaymentOrderInput,
  type CreatePaymentOrderResult,
  type PaymentOrderRecord,
} from './payment-orders'
export {
  claimPaymentReconciliationJobs,
  completePaymentReconciliationJob,
  ensurePaymentReconciliationJob,
  reschedulePaymentReconciliationJob,
  type ClaimPaymentReconciliationJobsInput,
  type PaymentReconciliationJob,
} from './payment-reconciliation'
export {
  createPaymentReversal,
  PaymentReversalConflictError,
  PaymentReversalUnavailableError,
  type CreatePaymentReversalInput,
  type CreatePaymentReversalResult,
  type PaymentReversalRecord,
} from './payment-reversals'
export {
  findReadingProgress,
  saveReadingProgress,
  type ReadingProgressSnapshot,
  type SaveReadingProgressInput,
  type SaveReadingProgressResult,
} from './reading-progress'
export {
  CreditGrantConflictError,
  findWalletBalance,
  grantCredits,
  type GrantCreditsInput,
  type GrantCreditsResult,
} from './wallets'
export {
  assertWalletsReconciled,
  findWalletHistory,
  InvalidWalletHistoryCursorError,
  reconcileWallets,
  WalletReconciliationError,
  type WalletDiscrepancy,
  type WalletDiscrepancyCode,
  type WalletHistoryPage,
  type WalletReconciliationInput,
  type WalletReconciliationResult,
  type WalletTransaction,
  type WalletTransactionKind,
} from './wallet-reconciliation'
export {
  FinancialIntegrityError,
  InsufficientCreditsError,
  StoryUnlockUnavailableError,
  UnlockOperationConflictError,
  unlockStoryWithCredit,
  type UnlockStoryInput,
  type UnlockStoryResult,
} from './story-unlocks'
export * from './schema'
