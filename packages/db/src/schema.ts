import { sql } from 'drizzle-orm'
import {
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

type LifecycleState = 'active' | 'disabled' | 'pending_deletion'
type StoryState = 'draft' | 'published' | 'archived' | 'withdrawn'

export const users = pgTable(
  'users',
  {
    accountState: text('account_state')
      .$type<LifecycleState>()
      .notNull()
      .default('active'),
    clerkSubject: varchar('clerk_subject', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    id: uuid('id').defaultRandom().primaryKey(),
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

export const storyLocalizations = pgTable(
  'story_localizations',
  {
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid('id').defaultRandom().primaryKey(),
    locale: varchar('locale', { length: 12 }).notNull(),
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
    revision: integer('revision').notNull(),
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
