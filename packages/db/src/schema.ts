import { sql } from 'drizzle-orm'
import type { AccountState, StaffRole } from '@curiofold/domain'
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
