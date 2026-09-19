/** Narrow transaction contract used by repositories without exposing a global client. */
export interface TransactionScope {
  readonly id: string
}

export { createDatabase } from './client'
export { findPublishedStory } from './published-stories'
export * from './schema'
