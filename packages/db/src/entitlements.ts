import {
  compileStoryDocument,
  type CompiledStoryDocument,
} from '@curiofold/content'
import { and, eq, inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import {
  findPublishedStoryBySlug,
  type PublishedStoryLocalization,
} from './published-stories'
import * as schema from './schema'

type CuriofoldDatabase = NodePgDatabase<typeof schema>

export type EntitledStoryRouteResolution =
  | Readonly<{
      status: 'found'
      story: CompiledStoryDocument
    }>
  | Readonly<{
      status: 'not_entitled'
    }>
  | Readonly<{
      availableLocalizations: readonly PublishedStoryLocalization[]
      status: 'missing_locale'
    }>
  | Readonly<{
      status: 'not_found'
    }>

export interface GrantStoryEntitlementInput {
  readonly actorUserId?: string
  readonly grantedAt?: Date
  readonly reason: string
  readonly source: 'seed' | 'support' | 'unlock'
  readonly storyId: string
  readonly userId: string
}

export interface GrantStoryEntitlementResult {
  readonly created: boolean
  readonly entitlementId: string
  readonly status: 'active' | 'revoked'
}

export interface RevokeStoryEntitlementInput {
  readonly actorUserId?: string
  readonly entitlementId: string
  readonly reason: string
  readonly revokedAt?: Date
}

export interface RevokeStoryEntitlementResult {
  readonly changed: boolean
  readonly entitlementId: string
  readonly status: 'revoked'
}

export async function grantStoryEntitlement(
  database: CuriofoldDatabase,
  input: GrantStoryEntitlementInput,
): Promise<GrantStoryEntitlementResult> {
  const occurredAt = input.grantedAt ?? new Date()
  const reason = input.reason.trim()
  if (!reason) {
    throw new TypeError('An entitlement grant requires a reason.')
  }

  return database.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(schema.storyEntitlements)
      .values({
        grantedAt: occurredAt,
        grantSource: input.source,
        storyId: input.storyId,
        updatedAt: occurredAt,
        userId: input.userId,
      })
      .onConflictDoNothing({
        target: [
          schema.storyEntitlements.userId,
          schema.storyEntitlements.storyId,
        ],
      })
      .returning({
        id: schema.storyEntitlements.id,
        status: schema.storyEntitlements.status,
      })

    if (created) {
      await transaction.insert(schema.entitlementEvents).values({
        actorUserId: input.actorUserId,
        entitlementId: created.id,
        eventType: 'granted',
        occurredAt,
        reason,
      })

      return {
        created: true,
        entitlementId: created.id,
        status: created.status,
      }
    }

    const [existing] = await transaction
      .select({
        id: schema.storyEntitlements.id,
        status: schema.storyEntitlements.status,
      })
      .from(schema.storyEntitlements)
      .where(
        and(
          eq(schema.storyEntitlements.userId, input.userId),
          eq(schema.storyEntitlements.storyId, input.storyId),
        ),
      )
      .limit(1)

    if (!existing) {
      throw new Error('Entitlement conflict could not be resolved.')
    }

    return {
      created: false,
      entitlementId: existing.id,
      status: existing.status,
    }
  })
}

export async function findEntitledStoryBySlug(
  database: CuriofoldDatabase,
  userId: string,
  locale: string,
  slug: string,
): Promise<EntitledStoryRouteResolution> {
  const [owned] = await database
    .select({ document: schema.storyVersions.document })
    .from(schema.storyEntitlements)
    .innerJoin(
      schema.stories,
      eq(schema.stories.id, schema.storyEntitlements.storyId),
    )
    .innerJoin(
      schema.storyLocalizations,
      eq(schema.storyLocalizations.storyId, schema.stories.id),
    )
    .innerJoin(
      schema.storyVersions,
      eq(
        schema.storyVersions.id,
        schema.storyLocalizations.currentPublishedVersionId,
      ),
    )
    .where(
      and(
        eq(schema.storyEntitlements.userId, userId),
        eq(schema.storyEntitlements.status, 'active'),
        eq(schema.storyLocalizations.locale, locale),
        eq(schema.storyLocalizations.slug, slug),
        inArray(schema.storyLocalizations.state, ['published', 'archived']),
      ),
    )
    .limit(1)

  if (owned) {
    const story = compileStoryDocument(owned.document)
    if (
      story.document.locale !== locale ||
      story.document.slug !== slug ||
      (story.document.publication.state !== 'published' &&
        story.document.publication.state !== 'archived')
    ) {
      throw new Error(
        'Entitled Story projection does not match its requested route.',
      )
    }

    return { status: 'found', story }
  }

  const publicResolution = await findPublishedStoryBySlug(
    database,
    locale,
    slug,
  )
  if (publicResolution.status === 'found') {
    return { status: 'not_entitled' }
  }

  return publicResolution
}

export async function revokeStoryEntitlement(
  database: CuriofoldDatabase,
  input: RevokeStoryEntitlementInput,
): Promise<RevokeStoryEntitlementResult> {
  const occurredAt = input.revokedAt ?? new Date()
  const reason = input.reason.trim()
  if (!reason) {
    throw new TypeError('An entitlement revocation requires a reason.')
  }

  return database.transaction(async (transaction) => {
    const [revoked] = await transaction
      .update(schema.storyEntitlements)
      .set({
        revokedAt: occurredAt,
        status: 'revoked',
        updatedAt: occurredAt,
      })
      .where(
        and(
          eq(schema.storyEntitlements.id, input.entitlementId),
          eq(schema.storyEntitlements.status, 'active'),
        ),
      )
      .returning({ id: schema.storyEntitlements.id })

    if (revoked) {
      await transaction.insert(schema.entitlementEvents).values({
        actorUserId: input.actorUserId,
        entitlementId: revoked.id,
        eventType: 'revoked',
        occurredAt,
        reason,
      })

      return {
        changed: true,
        entitlementId: revoked.id,
        status: 'revoked',
      }
    }

    const [existing] = await transaction
      .select({
        id: schema.storyEntitlements.id,
        status: schema.storyEntitlements.status,
      })
      .from(schema.storyEntitlements)
      .where(eq(schema.storyEntitlements.id, input.entitlementId))
      .limit(1)

    if (!existing) {
      throw new Error('Entitlement to revoke was not found.')
    }
    if (existing.status !== 'revoked') {
      throw new Error('Entitlement revocation state is invalid.')
    }

    return {
      changed: false,
      entitlementId: existing.id,
      status: 'revoked',
    }
  })
}
