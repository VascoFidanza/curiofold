/** Narrow transaction contract used by repositories without exposing a global client. */
export interface TransactionScope {
  readonly id: string
}

export { createDatabase } from './client'
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
export * from './schema'
