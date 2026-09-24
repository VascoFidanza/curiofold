import { sql } from 'drizzle-orm'
import type {
  AccountState,
  CreditGrantSource,
  PaymentOrderStatus,
  StaffRole,
} from '@curiofold/domain'
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

type StoryState = 'draft' | 'published' | 'archived' | 'withdrawn'
type IdentityEventResult = 'applied' | 'duplicate' | 'ignored'
type IdentityEventType = 'user.created' | 'user.deleted' | 'user.updated'
type EntitlementEventType = 'granted' | 'restored' | 'revoked'
type EntitlementGrantSource = 'seed' | 'support' | 'unlock'
type EntitlementStatus = 'active' | 'revoked'
type UnlockOutcome = 'already_owned' | 'unlocked'
type WalletEntryType = 'correction' | 'grant' | 'reversal' | 'spend'
type ProviderEventStatus = 'pending' | 'processed'

export const users = pgTable(
  'users',
  {
    accountState: text('account_state')
      .$type<AccountState>()
      .notNull()
      .default('active'),
    clerkSubject: varchar('clerk_subject', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    id: uuid('id').defaultRandom().primaryKey(),
    lastAuthenticatedAt: timestamp('last_authenticated_at', {
      withTimezone: true,
    }),
    lastIdentityEventAt: timestamp('last_identity_event_at', {
      withTimezone: true,
    }),
    lastIdentityEventId: varchar('last_identity_event_id', { length: 255 }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('users_clerk_subject_unique').on(table.clerkSubject),
    check(
      'users_account_state_check',
      sql`account_state IN ('active', 'disabled', 'pending_deletion')`,
    ),
  ],
)

export const identityEvents = pgTable(
  'identity_events',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    eventType: varchar('event_type', { length: 80 })
      .$type<IdentityEventType>()
      .notNull(),
    id: uuid('id').defaultRandom().primaryKey(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    providerEventId: varchar('provider_event_id', { length: 255 }).notNull(),
    result: text('result')
      .$type<IdentityEventResult>()
      .notNull()
      .default('applied'),
    subject: varchar('subject', { length: 255 }).notNull(),
  },
  (table) => [
    uniqueIndex('identity_events_provider_event_id_unique').on(
      table.providerEventId,
    ),
    index('identity_events_subject_occurred_at_index').on(
      table.subject,
      table.occurredAt,
    ),
    check(
      'identity_events_type_check',
      sql`event_type IN ('user.created', 'user.deleted', 'user.updated')`,
    ),
    check(
      'identity_events_result_check',
      sql`result IN ('applied', 'duplicate', 'ignored')`,
    ),
  ],
)

export const walletAccounts = pgTable(
  'wallet_accounts',
  {
    balanceCached: integer('balance_cached').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid('id').defaultRandom().primaryKey(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    version: integer('version').notNull().default(0),
  },
  (table) => [
    uniqueIndex('wallet_accounts_user_unique').on(table.userId),
    check('wallet_accounts_version_check', sql`${table.version} >= 0`),
  ],
)

export const creditGrants = pgTable(
  'credit_grants',
  {
    actorUserId: uuid('actor_user_id').references(() => users.id),
    grantedAt: timestamp('granted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid('id').defaultRandom().primaryKey(),
    operationKey: varchar('operation_key', { length: 200 }).notNull(),
    reason: text('reason').notNull(),
    source: text('source').$type<CreditGrantSource>().notNull(),
    sourceReference: varchar('source_reference', { length: 255 }),
    unitsGranted: integer('units_granted').notNull(),
    unitsRemaining: integer('units_remaining').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    walletAccountId: uuid('wallet_account_id')
      .notNull()
      .references(() => walletAccounts.id),
  },
  (table) => [
    uniqueIndex('credit_grants_operation_key_unique').on(table.operationKey),
    index('credit_grants_wallet_granted_index').on(
      table.walletAccountId,
      table.grantedAt,
    ),
    index('credit_grants_source_reference_index').on(
      table.source,
      table.sourceReference,
    ),
    check(
      'credit_grants_source_check',
      sql`source IN ('correction', 'payment', 'promotional', 'seed', 'support')`,
    ),
    check(
      'credit_grants_units_check',
      sql`${table.unitsGranted} > 0 AND ${table.unitsRemaining} BETWEEN 0 AND ${table.unitsGranted}`,
    ),
    check(
      'credit_grants_operation_key_check',
      sql`length(trim(${table.operationKey})) BETWEEN 1 AND 200`,
    ),
    check('credit_grants_reason_check', sql`length(trim(${table.reason})) > 0`),
    check(
      'credit_grants_source_reference_check',
      sql`${table.sourceReference} IS NULL OR length(trim(${table.sourceReference})) > 0`,
    ),
  ],
)

export const walletEntries = pgTable(
  'wallet_entries',
  {
    actorUserId: uuid('actor_user_id').references(() => users.id),
    balanceAfter: integer('balance_after').notNull(),
    creditGrantId: uuid('credit_grant_id').references(() => creditGrants.id),
    delta: integer('delta').notNull(),
    entryType: text('entry_type').$type<WalletEntryType>().notNull(),
    id: uuid('id').defaultRandom().primaryKey(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    operationKey: varchar('operation_key', { length: 200 }).notNull(),
    reason: text('reason').notNull(),
    walletAccountId: uuid('wallet_account_id')
      .notNull()
      .references(() => walletAccounts.id),
    walletVersion: integer('wallet_version').notNull(),
  },
  (table) => [
    uniqueIndex('wallet_entries_operation_key_unique').on(table.operationKey),
    uniqueIndex('wallet_entries_credit_grant_unique')
      .on(table.creditGrantId)
      .where(
        sql`${table.creditGrantId} IS NOT NULL AND ${table.entryType} = 'grant'`,
      ),
    index('wallet_entries_wallet_occurred_index').on(
      table.walletAccountId,
      table.occurredAt,
    ),
    uniqueIndex('wallet_entries_wallet_version_unique').on(
      table.walletAccountId,
      table.walletVersion,
    ),
    check(
      'wallet_entries_type_check',
      sql`entry_type IN ('correction', 'grant', 'reversal', 'spend')`,
    ),
    check('wallet_entries_delta_check', sql`${table.delta} <> 0`),
    check('wallet_entries_version_check', sql`${table.walletVersion} > 0`),
    check(
      'wallet_entries_shape_check',
      sql`(${table.entryType} = 'grant' AND ${table.creditGrantId} IS NOT NULL AND ${table.delta} > 0) OR (${table.entryType} = 'spend' AND ${table.creditGrantId} IS NULL AND ${table.delta} < 0) OR (${table.entryType} IN ('correction', 'reversal') AND ${table.delta} <> 0)`,
    ),
    check(
      'wallet_entries_operation_key_check',
      sql`length(trim(${table.operationKey})) BETWEEN 1 AND 200`,
    ),
    check(
      'wallet_entries_reason_check',
      sql`length(trim(${table.reason})) > 0`,
    ),
  ],
)

export const creditSpendAllocations = pgTable(
  'credit_spend_allocations',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    creditGrantId: uuid('credit_grant_id')
      .notNull()
      .references(() => creditGrants.id),
    id: uuid('id').defaultRandom().primaryKey(),
    units: integer('units').notNull(),
    walletEntryId: uuid('wallet_entry_id')
      .notNull()
      .references(() => walletEntries.id),
  },
  (table) => [
    uniqueIndex('credit_spend_allocations_entry_grant_unique').on(
      table.walletEntryId,
      table.creditGrantId,
    ),
    index('credit_spend_allocations_grant_index').on(table.creditGrantId),
    check('credit_spend_allocations_units_check', sql`${table.units} > 0`),
  ],
)

export const paymentOrders = pgTable(
  'payment_orders',
  {
    amountMinor: integer('amount_minor').notNull(),
    baseCredits: integer('base_credits'),
    bonusCredits: integer('bonus_credits'),
    bonusRateBps: integer('bonus_rate_bps'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    creditsPurchased: integer('credits_purchased').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    id: uuid('id').defaultRandom().primaryKey(),
    operationKey: varchar('operation_key', { length: 200 }).notNull(),
    packKey: varchar('pack_key', { length: 80 }).notNull(),
    pricingVersion: varchar('pricing_version', { length: 80 }),
    purchaseType: text('purchase_type'),
    providerCheckoutSessionId: varchar('provider_checkout_session_id', {
      length: 255,
    }),
    providerKey: varchar('provider_key', { length: 80 }),
    providerPaymentId: varchar('provider_payment_id', { length: 255 }),
    returnPath: varchar('return_path', { length: 500 }).notNull(),
    status: text('status')
      .$type<PaymentOrderStatus>()
      .notNull()
      .default('pending'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    uniqueIndex('payment_orders_user_operation_unique').on(
      table.userId,
      table.operationKey,
    ),
    uniqueIndex('payment_orders_provider_session_unique')
      .on(table.providerKey, table.providerCheckoutSessionId)
      .where(sql`${table.providerCheckoutSessionId} IS NOT NULL`),
    uniqueIndex('payment_orders_provider_payment_unique')
      .on(table.providerKey, table.providerPaymentId)
      .where(sql`${table.providerPaymentId} IS NOT NULL`),
    index('payment_orders_user_created_index').on(
      table.userId,
      table.createdAt,
    ),
    index('payment_orders_status_updated_index').on(
      table.status,
      table.updatedAt,
    ),
    check('payment_orders_amount_check', sql`${table.amountMinor} > 0`),
    check(
      'payment_orders_pricing_shape_check',
      sql`(${table.pricingVersion} IS NULL AND ${table.purchaseType} IS NULL AND ${table.baseCredits} IS NULL AND ${table.bonusRateBps} IS NULL AND ${table.bonusCredits} IS NULL) OR (${table.pricingVersion} IS NOT NULL AND ${table.purchaseType} IS NOT NULL AND ${table.baseCredits} IS NOT NULL AND ${table.bonusRateBps} IS NOT NULL AND ${table.bonusCredits} IS NOT NULL AND ${table.baseCredits} > 0 AND ${table.bonusRateBps} BETWEEN 0 AND 1800 AND ${table.bonusCredits} >= 0)`,
    ),
    check('payment_orders_credits_check', sql`${table.creditsPurchased} > 0`),
    check(
      'payment_orders_currency_check',
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      'payment_orders_pack_key_check',
      sql`${table.packKey} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
    check(
      'payment_orders_operation_key_check',
      sql`length(trim(${table.operationKey})) BETWEEN 1 AND 200`,
    ),
    check(
      'payment_orders_return_path_check',
      sql`${table.returnPath} LIKE '/%' AND ${table.returnPath} NOT LIKE '//%'`,
    ),
    check(
      'payment_orders_status_check',
      sql`${table.status} IN ('pending', 'checkout_created', 'payment_pending', 'fulfilled', 'canceled')`,
    ),
    check(
      'payment_orders_provider_shape_check',
      sql`(${table.providerKey} IS NULL AND ${table.providerCheckoutSessionId} IS NULL AND ${table.providerPaymentId} IS NULL) OR (${table.providerKey} IS NOT NULL AND ${table.providerCheckoutSessionId} IS NOT NULL)`,
    ),
  ],
)

export const providerEvents = pgTable(
  'provider_events',
  {
    attemptCount: integer('attempt_count').notNull().default(0),
    eventType: varchar('event_type', { length: 120 }).notNull(),
    id: uuid('id').defaultRandom().primaryKey(),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    orderId: uuid('order_id').references(() => paymentOrders.id),
    payloadDigest: varchar('payload_digest', { length: 64 }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    providerCreatedAt: timestamp('provider_created_at', {
      withTimezone: true,
    }).notNull(),
    providerEventId: varchar('provider_event_id', { length: 255 }).notNull(),
    providerKey: varchar('provider_key', { length: 80 }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text('status')
      .$type<ProviderEventStatus>()
      .notNull()
      .default('pending'),
  },
  (table) => [
    uniqueIndex('provider_events_provider_id_unique').on(
      table.providerKey,
      table.providerEventId,
    ),
    index('provider_events_status_received_index').on(
      table.status,
      table.receivedAt,
    ),
    check(
      'provider_events_digest_check',
      sql`${table.payloadDigest} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      'provider_events_status_check',
      sql`${table.status} IN ('pending', 'processed')`,
    ),
    check(
      'provider_events_attempt_count_check',
      sql`${table.attemptCount} >= 0`,
    ),
  ],
)

export const paymentReconciliationJobStatuses = [
  'pending',
  'running',
  'completed',
  'exhausted',
] as const
export type PaymentReconciliationJobStatus =
  (typeof paymentReconciliationJobStatuses)[number]

export const paymentReconciliationJobs = pgTable(
  'payment_reconciliation_jobs',
  {
    attemptCount: integer('attempt_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    exhaustedAt: timestamp('exhausted_at', { withTimezone: true }),
    id: uuid('id').defaultRandom().primaryKey(),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    lastErrorCode: varchar('last_error_code', { length: 80 }),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => paymentOrders.id),
    status: text('status')
      .$type<PaymentReconciliationJobStatus>()
      .notNull()
      .default('pending'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('payment_reconciliation_jobs_order_unique').on(table.orderId),
    index('payment_reconciliation_jobs_due_index').on(
      table.status,
      table.nextAttemptAt,
    ),
    check(
      'payment_reconciliation_jobs_attempt_check',
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      'payment_reconciliation_jobs_status_check',
      sql`${table.status} IN ('pending', 'running', 'completed', 'exhausted')`,
    ),
  ],
)

export const outboxEvents = pgTable(
  'outbox_events',
  {
    aggregateId: uuid('aggregate_id').notNull(),
    aggregateType: varchar('aggregate_type', { length: 80 }).notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    eventType: varchar('event_type', { length: 120 }).notNull(),
    id: uuid('id').defaultRandom().primaryKey(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('outbox_events_aggregate_event_unique').on(
      table.aggregateType,
      table.aggregateId,
      table.eventType,
    ),
    index('outbox_events_unpublished_index')
      .on(table.createdAt)
      .where(sql`${table.publishedAt} IS NULL`),
    check('outbox_events_attempt_count_check', sql`${table.attemptCount} >= 0`),
  ],
)

export const staffRoleAssignments = pgTable(
  'staff_role_assignments',
  {
    grantedAt: timestamp('granted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    grantedByUserId: uuid('granted_by_user_id').references(() => users.id),
    id: uuid('id').defaultRandom().primaryKey(),
    reason: text('reason').notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedByUserId: uuid('revoked_by_user_id').references(() => users.id),
    role: text('role').$type<StaffRole>().notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    uniqueIndex('staff_role_assignments_active_role_unique')
      .on(table.userId, table.role)
      .where(sql`${table.revokedAt} IS NULL`),
    index('staff_role_assignments_user_index').on(table.userId),
    check(
      'staff_role_assignments_role_check',
      sql`role IN ('editor', 'publisher', 'support', 'finance', 'admin')`,
    ),
    check(
      'staff_role_assignments_revocation_check',
      sql`${table.revokedAt} IS NULL OR (${table.revokedByUserId} IS NOT NULL AND ${table.revokedAt} >= ${table.grantedAt})`,
    ),
  ],
)

export const stories = pgTable(
  'stories',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid('id').defaultRandom().primaryKey(),
    stableKey: varchar('stable_key', { length: 120 }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('stories_stable_key_unique').on(table.stableKey)],
)

export const storyEntitlements = pgTable(
  'story_entitlements',
  {
    grantedAt: timestamp('granted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    grantSource: text('grant_source').$type<EntitlementGrantSource>().notNull(),
    id: uuid('id').defaultRandom().primaryKey(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    status: text('status')
      .$type<EntitlementStatus>()
      .notNull()
      .default('active'),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    uniqueIndex('story_entitlements_user_story_unique').on(
      table.userId,
      table.storyId,
    ),
    index('story_entitlements_story_index').on(table.storyId),
    check(
      'story_entitlements_status_check',
      sql`status IN ('active', 'revoked')`,
    ),
    check(
      'story_entitlements_grant_source_check',
      sql`grant_source IN ('seed', 'support', 'unlock')`,
    ),
    check(
      'story_entitlements_revocation_check',
      sql`(status = 'active' AND ${table.revokedAt} IS NULL) OR (status = 'revoked' AND ${table.revokedAt} IS NOT NULL)`,
    ),
  ],
)

export const entitlementEvents = pgTable(
  'entitlement_events',
  {
    actorUserId: uuid('actor_user_id').references(() => users.id),
    entitlementId: uuid('entitlement_id')
      .notNull()
      .references(() => storyEntitlements.id),
    eventType: text('event_type').$type<EntitlementEventType>().notNull(),
    id: uuid('id').defaultRandom().primaryKey(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    reason: text('reason').notNull(),
  },
  (table) => [
    index('entitlement_events_entitlement_occurred_index').on(
      table.entitlementId,
      table.occurredAt,
    ),
    check(
      'entitlement_events_type_check',
      sql`event_type IN ('granted', 'restored', 'revoked')`,
    ),
    check(
      'entitlement_events_reason_check',
      sql`length(trim(${table.reason})) > 0`,
    ),
  ],
)

export const unlockOperations = pgTable(
  'unlock_operations',
  {
    balanceAfter: integer('balance_after').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    entitlementId: uuid('entitlement_id')
      .notNull()
      .references(() => storyEntitlements.id),
    id: uuid('id').defaultRandom().primaryKey(),
    operationKey: varchar('operation_key', { length: 200 }).notNull(),
    outcome: text('outcome').$type<UnlockOutcome>().notNull(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    walletEntryId: uuid('wallet_entry_id').references(() => walletEntries.id),
    walletVersion: integer('wallet_version').notNull(),
  },
  (table) => [
    uniqueIndex('unlock_operations_operation_key_unique').on(
      table.operationKey,
    ),
    index('unlock_operations_user_created_index').on(
      table.userId,
      table.createdAt,
    ),
    index('unlock_operations_story_index').on(table.storyId),
    check(
      'unlock_operations_outcome_check',
      sql`outcome IN ('already_owned', 'unlocked')`,
    ),
    check(
      'unlock_operations_result_shape_check',
      sql`(${table.outcome} = 'unlocked' AND ${table.walletEntryId} IS NOT NULL) OR (${table.outcome} = 'already_owned' AND ${table.walletEntryId} IS NULL)`,
    ),
    check(
      'unlock_operations_balance_check',
      sql`${table.balanceAfter} >= 0 AND ${table.walletVersion} >= 0`,
    ),
    check(
      'unlock_operations_operation_key_check',
      sql`length(trim(${table.operationKey})) BETWEEN 1 AND 200`,
    ),
  ],
)

export const storyLocalizations = pgTable(
  'story_localizations',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid('id').defaultRandom().primaryKey(),
    locale: varchar('locale', { length: 12 }).notNull(),
    currentPublishedVersionId: uuid('current_published_version_id').references(
      (): AnyPgColumn => storyVersions.id,
    ),
    deck: text('deck').notNull().default(''),
    hook: text('hook').notNull().default(''),
    preview: text('preview').notNull().default(''),
    readingMinutes: integer('reading_minutes').notNull().default(1),
    slug: varchar('slug', { length: 180 }).notNull(),
    state: text('state').$type<StoryState>().notNull().default('draft'),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id),
    title: varchar('title', { length: 240 }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('story_localizations_story_locale_unique').on(
      table.storyId,
      table.locale,
    ),
    uniqueIndex('story_localizations_locale_slug_unique').on(
      table.locale,
      table.slug,
    ),
    index('story_localizations_state_index').on(table.state),
    check(
      'story_localizations_state_check',
      sql`state IN ('draft', 'published', 'archived', 'withdrawn')`,
    ),
    check(
      'story_localizations_reading_minutes_positive_check',
      sql`${table.readingMinutes} > 0`,
    ),
    check(
      'story_localizations_published_pointer_check',
      sql`${table.state} <> 'published' OR ${table.currentPublishedVersionId} IS NOT NULL`,
    ),
  ],
)

export const storyVersions = pgTable(
  'story_versions',
  {
    contentHash: varchar('content_hash', { length: 128 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    document: jsonb('document').notNull(),
    gitCommitSha: varchar('git_commit_sha', { length: 64 }).notNull(),
    id: uuid('id').defaultRandom().primaryKey(),
    localizationId: uuid('localization_id')
      .notNull()
      .references(() => storyLocalizations.id),
    previousVersionId: uuid('previous_version_id').references(
      (): AnyPgColumn => storyVersions.id,
    ),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    revision: integer('revision').notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: varchar('reviewed_by', { length: 240 }),
    schemaVersion: varchar('schema_version', { length: 32 }).notNull(),
  },
  (table) => [
    uniqueIndex('story_versions_localization_revision_unique').on(
      table.localizationId,
      table.revision,
    ),
    uniqueIndex('story_versions_content_hash_unique').on(table.contentHash),
    check('story_versions_revision_positive_check', sql`${table.revision} > 0`),
  ],
)

export const readingProgress = pgTable(
  'reading_progress',
  {
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    highWaterPercent: integer('high_water_percent').notNull().default(0),
    id: uuid('id').defaultRandom().primaryKey(),
    lastClientSequence: integer('last_client_sequence').notNull().default(0),
    locale: varchar('locale', { length: 12 }).notNull(),
    resumeBlockId: varchar('resume_block_id', { length: 120 }),
    resumeOffset: integer('resume_offset').notNull().default(0),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    versionId: uuid('version_id')
      .notNull()
      .references(() => storyVersions.id),
  },
  (table) => [
    uniqueIndex('reading_progress_user_story_locale_unique').on(
      table.userId,
      table.storyId,
      table.locale,
    ),
    check(
      'reading_progress_high_water_percent_check',
      sql`high_water_percent BETWEEN 0 AND 100`,
    ),
    check('reading_progress_resume_offset_check', sql`resume_offset >= 0`),
    check(
      'reading_progress_client_sequence_check',
      sql`last_client_sequence >= 0`,
    ),
  ],
)

export const auditEvents = pgTable(
  'audit_events',
  {
    action: varchar('action', { length: 120 }).notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id),
    correlationId: varchar('correlation_id', { length: 120 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid('id').defaultRandom().primaryKey(),
    metadata: jsonb('metadata'),
    reason: text('reason'),
    targetId: uuid('target_id'),
    targetType: varchar('target_type', { length: 80 }).notNull(),
  },
  (table) => [
    index('audit_events_created_at_index').on(table.createdAt),
    index('audit_events_target_index').on(table.targetType, table.targetId),
  ],
)
