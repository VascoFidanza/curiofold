/** Narrow transaction contract used by repositories without exposing a global client. */
export interface TransactionScope {
  readonly id: string
}

export { createDatabase } from './client'
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
  type PublishedStoryLocalization,
  type PublishedStoryRouteResolution,
} from './published-stories'
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
export * from './schema'
