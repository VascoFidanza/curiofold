import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { compileStoryDocument } from '@curiofold/content'
import { eq } from 'drizzle-orm'
import { Client } from 'pg'
import { describe, expect, it } from 'vitest'

import { createDatabase } from './client'
import {
  applyIdentityLifecycleEvent,
  ensureIdentityAccount,
  findIdentityAccount,
} from './identity'
import {
  findEntitledStoryBySlug,
  grantStoryEntitlement,
  revokeStoryEntitlement,
} from './entitlements'
import {
  findPublishedStory,
  findPublishedStoryBySlug,
} from './published-stories'
import {
  attachPaymentCheckoutSession,
  createPaymentOrder,
  findPaymentOrderForUser,
  PaymentOrderConflictError,
} from './payment-orders'
import {
  claimPaymentReconciliationJobs,
  completePaymentReconciliationJob,
  reschedulePaymentReconciliationJob,
} from './payment-reconciliation'
import {
  createPaymentReversal,
  PaymentReversalConflictError,
} from './payment-reversals'
import {
  processProviderEvent,
  ProviderEventRetryableError,
  recordProviderEvent,
} from './payment-events'
import { findReadingProgress, saveReadingProgress } from './reading-progress'
import {
  creditGrants,
  creditSpendAllocations,
  entitlementEvents,
  paymentOrders,
  paymentReconciliationJobs,
  paymentReversals,
  outboxEvents,
  providerEvents,
  staffRoleAssignments,
  stories,
  storyEntitlements,
  storyLocalizations,
  storyVersions,
  unlockOperations,
  walletAccounts,
  walletEntries,
} from './schema'
import {
  InsufficientCreditsError,
  StoryUnlockUnavailableError,
  UnlockOperationConflictError,
  unlockStoryWithCredit,
} from './story-unlocks'
import {
  CreditGrantConflictError,
  findWalletBalance,
  grantCredits,
} from './wallets'
import {
  assertWalletsReconciled,
  findWalletHistory,
  reconcileWallets,
  WalletReconciliationError,
} from './wallet-reconciliation'

const integrationEnabled = process.env.RUN_DB_INTEGRATION === '1'

async function loadStoryFixture(path: string) {
  return compileStoryDocument(
    JSON.parse(
      await readFile(
        fileURLToPath(
          new URL(
            `../../../content/stories/clockwork-gardens/${path}`,
            import.meta.url,
          ),
        ),
        'utf8',
      ),
    ) as unknown,
  )
}

describe.skipIf(!integrationEnabled)('PostgreSQL integration harness', () => {
  it('uses an isolated PostgreSQL 18 database', async () => {
    let connectionString = process.env.TEST_DATABASE_URL
    let stopDatabase = () => Promise.resolve()

    if (!connectionString) {
      const { GenericContainer, Wait } = await import('testcontainers')
      const container = await new GenericContainer('postgres:18-alpine')
        .withEnvironment({
          POSTGRES_DB: 'curiofold_test',
          POSTGRES_PASSWORD: 'curiofold_test',
          POSTGRES_USER: 'curiofold_test',
        })
        .withExposedPorts(5432)
        .withWaitStrategy(
          Wait.forLogMessage(
            /database system is ready to accept connections/,
            2,
          ),
        )
        .start()
      connectionString = `postgresql://curiofold_test:curiofold_test@${container.getHost()}:${String(container.getMappedPort(5432))}/curiofold_test`
      stopDatabase = () => container.stop().then(() => undefined)
    }

    const client = new Client({ connectionString })
    const database = createDatabase(connectionString)

    try {
      await client.connect()
      const migrationDirectory = fileURLToPath(
        new URL('../drizzle', import.meta.url),
      )
      const migrationFiles = (await readdir(migrationDirectory))
        .filter((file) => file.endsWith('.sql'))
        .sort()

      for (const migrationFile of migrationFiles) {
        const migration = await readFile(
          `${migrationDirectory}/${migrationFile}`,
          'utf8',
        )
        for (const statement of migration.split('--> statement-breakpoint')) {
          if (statement.trim()) {
            await client.query(statement)
          }
        }
      }

      const tables = await client.query<{ table_name: string }>(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public'
         ORDER BY table_name`,
      )

      expect(tables.rows.map((row) => row.table_name)).toEqual(
        expect.arrayContaining([
          'audit_events',
          'credit_grants',
          'credit_spend_allocations',
          'entitlement_events',
          'identity_events',
          'outbox_events',
          'payment_orders',
          'payment_reconciliation_jobs',
          'payment_reversals',
          'provider_events',
          'reading_progress',
          'staff_role_assignments',
          'stories',
          'story_entitlements',
          'story_localizations',
          'story_versions',
          'users',
          'unlock_operations',
          'wallet_accounts',
          'wallet_entries',
        ]),
      )

      const authenticatedAt = new Date('2026-09-20T10:00:00.000Z')
      const linkedAccount = await ensureIdentityAccount(
        database.client,
        'user_identity_fixture',
        authenticatedAt,
      )
      expect(linkedAccount).toMatchObject({
        accountState: 'active',
        emailVerified: false,
        staffRoles: new Set(),
      })

      const createdEvent = {
        emailVerified: true,
        eventId: 'evt_identity_created',
        occurredAt: new Date('2026-09-20T10:01:00.000Z'),
        subject: 'user_identity_fixture',
        type: 'user.created' as const,
      }
      await expect(
        applyIdentityLifecycleEvent(database.client, createdEvent),
      ).resolves.toBe('applied')
      await expect(
        applyIdentityLifecycleEvent(database.client, createdEvent),
      ).resolves.toBe('duplicate')

      await database.client.insert(staffRoleAssignments).values({
        reason: 'Synthetic integration-test assignment.',
        role: 'publisher',
        userId: linkedAccount.userId,
      })
      await expect(
        findIdentityAccount(database.client, 'user_identity_fixture'),
      ).resolves.toMatchObject({
        accountState: 'active',
        emailVerified: true,
        staffRoles: new Set(['publisher']),
      })

      await expect(
        applyIdentityLifecycleEvent(database.client, {
          emailVerified: false,
          eventId: 'evt_identity_deleted',
          occurredAt: new Date('2026-09-20T10:03:00.000Z'),
          subject: 'user_identity_fixture',
          type: 'user.deleted',
        }),
      ).resolves.toBe('applied')
      await expect(
        applyIdentityLifecycleEvent(database.client, {
          emailVerified: true,
          eventId: 'evt_identity_stale_update',
          occurredAt: new Date('2026-09-20T10:02:00.000Z'),
          subject: 'user_identity_fixture',
          type: 'user.updated',
        }),
      ).resolves.toBe('ignored')
      await expect(
        findIdentityAccount(database.client, 'user_identity_fixture'),
      ).resolves.toMatchObject({
        accountState: 'disabled',
        emailVerified: false,
      })

      const paymentOrderInput = {
        createdAt: new Date('2026-09-20T10:03:30.000Z'),
        operationKey: 'checkout:user_identity_fixture:request-1',
        returnPath: '/en/stories/clockwork-gardens?payment=return',
        snapshot: {
          amountMinor: 500,
          baseCredits: 5,
          bonusCredits: 0,
          bonusRateBps: 0,
          credits: 5,
          currency: 'EUR',
          packKey: 'top-up-v1',
          pricingVersion: 'top-up-eur-v1',
          purchaseType: 'credit_top_up',
        },
        userId: linkedAccount.userId,
      } as const
      const duplicateOrders = await Promise.all([
        createPaymentOrder(database.client, paymentOrderInput),
        createPaymentOrder(database.client, paymentOrderInput),
      ])
      expect(duplicateOrders.filter(({ created }) => created)).toHaveLength(1)
      expect(new Set(duplicateOrders.map(({ order }) => order.id)).size).toBe(1)
      expect(duplicateOrders[0].order).toMatchObject({
        amountMinor: 500,
        credits: 5,
        currency: 'EUR',
        packKey: 'top-up-v1',
        pricingVersion: 'top-up-eur-v1',
        purchaseType: 'credit_top_up',
        providerCheckoutSessionId: null,
        providerKey: null,
        providerPaymentId: null,
        returnPath: '/en/stories/clockwork-gardens?payment=return',
        status: 'pending',
        userId: linkedAccount.userId,
      })

      await expect(
        createPaymentOrder(database.client, {
          ...paymentOrderInput,
          snapshot: {
            ...paymentOrderInput.snapshot,
            amountMinor: 600,
            baseCredits: 6,
            credits: 6,
          },
        }),
      ).rejects.toBeInstanceOf(PaymentOrderConflictError)

      const secondAccount = await ensureIdentityAccount(
        database.client,
        'user_payment_order_second_fixture',
        new Date('2026-09-20T10:03:40.000Z'),
      )
      const secondPaymentOrder = await createPaymentOrder(database.client, {
        ...paymentOrderInput,
        returnPath: 'https://attacker.example/payment-return',
        userId: secondAccount.userId,
      })
      expect(secondPaymentOrder).toMatchObject({
        created: true,
        order: { returnPath: '/', userId: secondAccount.userId },
      })

      const orderId = duplicateOrders[0].order.id
      await expect(
        findPaymentOrderForUser(database.client, orderId, linkedAccount.userId),
      ).resolves.toMatchObject({ id: orderId })
      await expect(
        findPaymentOrderForUser(database.client, orderId, secondAccount.userId),
      ).resolves.toBeNull()

      const attachedCheckout = await attachPaymentCheckoutSession(
        database.client,
        {
          attachedAt: new Date('2026-09-20T10:03:35.000Z'),
          orderId,
          providerKey: 'stripe',
          providerSessionId: 'cs_test_payment_order_fixture',
        },
      )
      expect(attachedCheckout).toMatchObject({
        amountMinor: 500,
        credits: 5,
        providerCheckoutSessionId: 'cs_test_payment_order_fixture',
        providerKey: 'stripe',
        status: 'checkout_created',
      })
      await expect(
        attachPaymentCheckoutSession(database.client, {
          orderId,
          providerKey: 'stripe',
          providerSessionId: 'cs_test_payment_order_fixture',
        }),
      ).resolves.toMatchObject({ id: orderId, status: 'checkout_created' })
      await expect(
        attachPaymentCheckoutSession(database.client, {
          orderId,
          providerKey: 'stripe',
          providerSessionId: 'cs_test_conflicting_session',
        }),
      ).rejects.toBeInstanceOf(PaymentOrderConflictError)

      await attachPaymentCheckoutSession(database.client, {
        orderId: secondPaymentOrder.order.id,
        providerKey: 'stripe',
        providerSessionId: 'cs_test_fulfilment_fixture',
      })
      const providerEnvelope = {
        eventType: 'checkout.session.completed',
        payloadDigest: 'a'.repeat(64),
        providerCreatedAt: new Date('2026-09-20T10:03:50.000Z'),
        providerEventId: 'evt_test_fulfilment_fixture',
        providerKey: 'stripe',
        receivedAt: new Date('2026-09-20T10:03:51.000Z'),
      } as const
      await expect(
        recordProviderEvent(database.client, providerEnvelope),
      ).resolves.toMatchObject({ created: true, status: 'pending' })
      await expect(
        recordProviderEvent(database.client, providerEnvelope),
      ).resolves.toMatchObject({ created: false, status: 'pending' })

      const fulfilmentSnapshot = {
        checkoutUrl: null,
        providerPaymentId: 'pi_test_fulfilment_fixture',
        providerSessionId: 'cs_test_fulfilment_fixture',
        state: 'paid',
      } as const
      const fulfilmentResults = await Promise.all([
        processProviderEvent(database.client, {
          processedAt: new Date('2026-09-20T10:03:52.000Z'),
          providerEventId: providerEnvelope.providerEventId,
          providerKey: 'stripe',
          snapshot: fulfilmentSnapshot,
        }),
        processProviderEvent(database.client, {
          processedAt: new Date('2026-09-20T10:03:53.000Z'),
          providerEventId: providerEnvelope.providerEventId,
          providerKey: 'stripe',
          snapshot: fulfilmentSnapshot,
        }),
      ])
      expect(new Set(fulfilmentResults.map(({ outcome }) => outcome))).toEqual(
        new Set(['fulfilled', 'duplicate']),
      )
      await expect(
        findWalletBalance(database.client, secondAccount.userId),
      ).resolves.toEqual({ availableCredits: 5, version: 1 })
      const [fulfilledOrder] = await database.client
        .select()
        .from(paymentOrders)
        .where(eq(paymentOrders.id, secondPaymentOrder.order.id))
      expect(fulfilledOrder).toMatchObject({
        providerPaymentId: 'pi_test_fulfilment_fixture',
        status: 'fulfilled',
      })
      const storedEvents = await database.client
        .select()
        .from(providerEvents)
        .where(
          eq(providerEvents.providerEventId, providerEnvelope.providerEventId),
        )
      expect(storedEvents).toHaveLength(1)
      expect(storedEvents[0]).toMatchObject({
        attemptCount: 1,
        status: 'processed',
      })
      const fulfilledOutbox = await database.client
        .select()
        .from(outboxEvents)
        .where(eq(outboxEvents.aggregateId, secondPaymentOrder.order.id))
      expect(fulfilledOutbox).toHaveLength(1)

      const reversalInput = {
        amountMinor: 300,
        createdAt: new Date('2026-09-20T10:03:54.000Z'),
        createdByUserId: linkedAccount.userId,
        creditsRequested: 3,
        kind: 'refund' as const,
        operationKey: 'refund:order-fixture:request-1',
        orderId: secondPaymentOrder.order.id,
        reasonCode: 'customer_request',
      }
      const createdReversal = await createPaymentReversal(
        database.client,
        reversalInput,
      )
      expect(createdReversal).toMatchObject({
        created: true,
        reversal: {
          amountMinor: 300,
          creditsRequested: 3,
          currency: 'EUR',
          status: 'requested',
        },
      })
      await expect(
        createPaymentReversal(database.client, reversalInput),
      ).resolves.toMatchObject({
        created: false,
        reversal: { id: createdReversal.reversal.id },
      })
      await expect(
        createPaymentReversal(database.client, {
          ...reversalInput,
          amountMinor: 301,
        }),
      ).rejects.toBeInstanceOf(PaymentReversalConflictError)
      await expect(
        createPaymentReversal(database.client, {
          ...reversalInput,
          amountMinor: 201,
          creditsRequested: 2,
          operationKey: 'refund:order-fixture:request-2',
        }),
      ).rejects.toMatchObject({ code: 'amount_exceeded' })
      await expect(
        createPaymentReversal(database.client, {
          ...reversalInput,
          amountMinor: 100,
          creditsRequested: 3,
          operationKey: 'refund:order-fixture:request-3',
        }),
      ).rejects.toMatchObject({ code: 'amount_exceeded' })
      await expect(
        database.client
          .update(paymentReversals)
          .set({ amountMinor: 200 })
          .where(eq(paymentReversals.id, createdReversal.reversal.id)),
      ).rejects.toThrow()
      await expect(
        database.client
          .delete(paymentReversals)
          .where(eq(paymentReversals.id, createdReversal.reversal.id)),
      ).rejects.toThrow()

      await recordProviderEvent(database.client, {
        ...providerEnvelope,
        eventType: 'checkout.session.async_payment_failed',
        payloadDigest: 'b'.repeat(64),
        providerEventId: 'evt_test_delayed_failure_fixture',
      })
      await expect(
        processProviderEvent(database.client, {
          providerEventId: 'evt_test_delayed_failure_fixture',
          providerKey: 'stripe',
          snapshot: {
            ...fulfilmentSnapshot,
            providerPaymentId: null,
            state: 'canceled',
          },
        }),
      ).resolves.toMatchObject({ outcome: 'duplicate' })
      await expect(
        findWalletBalance(database.client, secondAccount.userId),
      ).resolves.toEqual({ availableCredits: 5, version: 1 })

      const delayedAccount = await ensureIdentityAccount(
        database.client,
        'user_payment_order_delayed_fixture',
        new Date('2026-09-20T10:03:54.000Z'),
      )
      const delayedOrder = await createPaymentOrder(database.client, {
        operationKey: 'checkout:delayed-order-fixture',
        returnPath: '/',
        snapshot: {
          amountMinor: 250,
          credits: 2,
          currency: 'EUR',
          packKey: 'two-credits',
        },
        userId: delayedAccount.userId,
      })
      await recordProviderEvent(database.client, {
        eventType: 'checkout.session.completed',
        payloadDigest: 'c'.repeat(64),
        providerCreatedAt: new Date('2026-09-20T10:03:55.000Z'),
        providerEventId: 'evt_test_delayed_order_fixture',
        providerKey: 'stripe',
      })
      const delayedSnapshot = {
        checkoutUrl: null,
        providerPaymentId: 'pi_test_delayed_order_fixture',
        providerSessionId: 'cs_test_delayed_order_fixture',
        state: 'paid',
      } as const
      await expect(
        processProviderEvent(database.client, {
          providerEventId: 'evt_test_delayed_order_fixture',
          providerKey: 'stripe',
          snapshot: delayedSnapshot,
        }),
      ).rejects.toBeInstanceOf(ProviderEventRetryableError)
      const [pendingDelayedEvent] = await database.client
        .select()
        .from(providerEvents)
        .where(
          eq(providerEvents.providerEventId, 'evt_test_delayed_order_fixture'),
        )
      expect(pendingDelayedEvent).toMatchObject({
        attemptCount: 0,
        status: 'pending',
      })
      if (!pendingDelayedEvent) {
        throw new Error('Expected persisted delayed provider event.')
      }
      await attachPaymentCheckoutSession(database.client, {
        attachedAt: new Date('2026-09-20T10:02:59.000Z'),
        orderId: delayedOrder.order.id,
        providerKey: 'stripe',
        providerSessionId: 'cs_test_delayed_order_fixture',
      })
      const claimedJobs = await claimPaymentReconciliationJobs(
        database.client,
        { now: new Date('2026-09-20T10:03:00.000Z') },
      )
      const claimedJob = claimedJobs.find(
        (job) => job.orderId === delayedOrder.order.id,
      )
      if (!claimedJob) throw new Error('Expected a reconciliation job.')
      expect(claimedJob.orderId).toBe(delayedOrder.order.id)
      const rescheduledJob = await reschedulePaymentReconciliationJob(
        database.client,
        claimedJob.id,
        {
          errorCode: 'provider_timeout',
          now: new Date('2026-09-20T10:03:01.000Z'),
        },
      )
      expect(rescheduledJob).toMatchObject({
        attemptCount: 1,
        lastErrorCode: 'provider_timeout',
        status: 'pending',
      })
      const reclaimedJobs = await claimPaymentReconciliationJobs(
        database.client,
        { now: new Date('2026-09-20T10:04:02.000Z') },
      )
      const reclaimedJob = reclaimedJobs.find(
        (job) => job.orderId === delayedOrder.order.id,
      )
      if (!reclaimedJob) throw new Error('Expected a reclaimed job.')
      await completePaymentReconciliationJob(database.client, reclaimedJob.id, {
        now: new Date('2026-09-20T10:04:01.000Z'),
      })
      await expect(
        database.client
          .select()
          .from(paymentReconciliationJobs)
          .where(eq(paymentReconciliationJobs.id, reclaimedJob.id)),
      ).resolves.toMatchObject([
        expect.objectContaining({ status: 'completed' }),
      ])
      await expect(
        processProviderEvent(database.client, {
          providerEventId: 'evt_test_delayed_order_fixture',
          providerKey: 'stripe',
          snapshot: delayedSnapshot,
        }),
      ).resolves.toMatchObject({ outcome: 'fulfilled' })
      await expect(
        findWalletBalance(database.client, delayedAccount.userId),
      ).resolves.toEqual({ availableCredits: 2, version: 1 })

      await expect(
        database.client
          .update(providerEvents)
          .set({ payloadDigest: 'd'.repeat(64) })
          .where(eq(providerEvents.id, pendingDelayedEvent.id)),
      ).rejects.toThrow()
      await expect(
        database.client
          .delete(outboxEvents)
          .where(eq(outboxEvents.aggregateId, delayedOrder.order.id)),
      ).rejects.toThrow()

      await expect(
        database.client.insert(paymentOrders).values({
          amountMinor: 0,
          creditsPurchased: 1,
          currency: 'EUR',
          operationKey: 'checkout:invalid-amount',
          packKey: 'one-credit',
          returnPath: '/',
          userId: linkedAccount.userId,
        }),
      ).rejects.toThrow()
      await expect(
        database.client
          .update(paymentOrders)
          .set({ amountMinor: 700 })
          .where(eq(paymentOrders.id, orderId)),
      ).rejects.toThrow()
      await expect(
        database.client
          .update(paymentOrders)
          .set({ bonusCredits: 1, creditsPurchased: 6 })
          .where(eq(paymentOrders.id, orderId)),
      ).rejects.toThrow()
      await expect(
        database.client
          .delete(paymentOrders)
          .where(eq(paymentOrders.id, orderId)),
      ).rejects.toThrow()

      await expect(
        findWalletBalance(database.client, linkedAccount.userId),
      ).resolves.toEqual({ availableCredits: 0, version: 0 })
      await expect(
        grantCredits(database.client, {
          operationKey: 'seed:invalid-zero',
          reason: 'Invalid integration-test grant.',
          source: 'seed',
          units: 0,
          userId: linkedAccount.userId,
        }),
      ).rejects.toThrow(TypeError)

      const duplicateCreditGrants = await Promise.all([
        grantCredits(database.client, {
          actorUserId: linkedAccount.userId,
          grantedAt: new Date('2026-09-20T10:04:00.000Z'),
          operationKey: 'seed:reader-welcome:user_identity_fixture',
          reason: 'Synthetic welcome-credit fixture.',
          source: 'seed',
          sourceReference: 'reader-welcome-v1',
          units: 5,
          userId: linkedAccount.userId,
        }),
        grantCredits(database.client, {
          actorUserId: linkedAccount.userId,
          grantedAt: new Date('2026-09-20T10:04:00.000Z'),
          operationKey: 'seed:reader-welcome:user_identity_fixture',
          reason: 'Synthetic welcome-credit fixture.',
          source: 'seed',
          sourceReference: 'reader-welcome-v1',
          units: 5,
          userId: linkedAccount.userId,
        }),
      ])
      expect(
        duplicateCreditGrants.filter(({ created }) => created),
      ).toHaveLength(1)
      expect(
        new Set(duplicateCreditGrants.map(({ receipt }) => receipt.grantId))
          .size,
      ).toBe(1)
      expect(duplicateCreditGrants[0].receipt).toMatchObject({
        availableCredits: 5,
        grantedCredits: 5,
        source: 'seed',
        walletVersion: 1,
      })

      await expect(
        grantCredits(database.client, {
          operationKey: 'seed:reader-welcome:user_identity_fixture',
          reason: 'Mismatched duplicate must fail closed.',
          source: 'seed',
          sourceReference: 'reader-welcome-v1',
          units: 6,
          userId: linkedAccount.userId,
        }),
      ).rejects.toBeInstanceOf(CreditGrantConflictError)

      await expect(
        grantCredits(database.client, {
          actorUserId: linkedAccount.userId,
          grantedAt: new Date('2026-09-20T10:05:00.000Z'),
          operationKey:
            'promotional:integration-campaign:user_identity_fixture',
          reason: 'Synthetic promotional-credit fixture.',
          source: 'promotional',
          sourceReference: 'integration-campaign',
          units: 2,
          userId: linkedAccount.userId,
        }),
      ).resolves.toMatchObject({
        created: true,
        receipt: {
          availableCredits: 7,
          grantedCredits: 2,
          walletVersion: 2,
        },
      })
      await expect(
        findWalletBalance(database.client, linkedAccount.userId),
      ).resolves.toEqual({ availableCredits: 7, version: 2 })

      const [wallet] = await database.client
        .select({
          balanceCached: walletAccounts.balanceCached,
          id: walletAccounts.id,
        })
        .from(walletAccounts)
        .where(eq(walletAccounts.userId, linkedAccount.userId))
        .limit(1)
      if (!wallet) {
        throw new Error('Expected wallet fixture to exist.')
      }

      const ledger = await database.client
        .select({
          balanceAfter: walletEntries.balanceAfter,
          delta: walletEntries.delta,
        })
        .from(walletEntries)
        .where(eq(walletEntries.walletAccountId, wallet.id))
      expect(ledger.map(({ delta }) => delta)).toEqual([5, 2])
      expect(ledger.reduce((total, { delta }) => total + delta, 0)).toBe(
        wallet.balanceCached,
      )
      expect(ledger.at(-1)?.balanceAfter).toBe(wallet.balanceCached)

      const grants = await database.client
        .select({
          operationKey: creditGrants.operationKey,
          source: creditGrants.source,
          sourceReference: creditGrants.sourceReference,
          unitsGranted: creditGrants.unitsGranted,
          unitsRemaining: creditGrants.unitsRemaining,
        })
        .from(creditGrants)
        .where(eq(creditGrants.walletAccountId, wallet.id))
      expect(grants).toHaveLength(2)
      expect(grants).toEqual(
        expect.arrayContaining([
          {
            operationKey: 'seed:reader-welcome:user_identity_fixture',
            source: 'seed',
            sourceReference: 'reader-welcome-v1',
            unitsGranted: 5,
            unitsRemaining: 5,
          },
          {
            operationKey:
              'promotional:integration-campaign:user_identity_fixture',
            source: 'promotional',
            sourceReference: 'integration-campaign',
            unitsGranted: 2,
            unitsRemaining: 2,
          },
        ]),
      )

      await expect(
        client.query(
          `INSERT INTO credit_grants (
             operation_key, reason, source, units_granted, units_remaining, wallet_account_id
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            'seed:direct-negative-insert',
            'Database constraint evidence.',
            'seed',
            -1,
            -1,
            wallet.id,
          ],
        ),
      ).rejects.toThrow(/credit_grants_units_check/u)
      await expect(
        client.query(
          `UPDATE wallet_entries SET delta = 100 WHERE wallet_account_id = $1`,
          [wallet.id],
        ),
      ).rejects.toThrow(/append-only/u)
      await expect(
        client.query(
          `UPDATE credit_grants SET source_reference = 'tampered' WHERE wallet_account_id = $1`,
          [wallet.id],
        ),
      ).rejects.toThrow(/provenance is immutable/u)
      await expect(
        client.query(`DELETE FROM credit_grants WHERE wallet_account_id = $1`, [
          wallet.id,
        ]),
      ).rejects.toThrow(/cannot be deleted/u)

      const original = await loadStoryFixture('en/1.json')
      const correction = await loadStoryFixture('en/2.json')
      const portugueseDraft = await loadStoryFixture('pt-PT/1.json')
      const [story] = await database.client
        .insert(stories)
        .values({ stableKey: correction.document.storyKey })
        .returning({ id: stories.id })

      if (!story) {
        throw new Error('Expected Story insertion to return an id.')
      }

      const [localization] = await database.client
        .insert(storyLocalizations)
        .values({
          deck: correction.document.metadata.deck,
          hook: correction.document.metadata.hook,
          locale: correction.document.locale,
          preview: correction.document.metadata.preview,
          readingMinutes: correction.document.metadata.readingMinutes,
          slug: correction.document.slug,
          state: 'draft',
          storyId: story.id,
          title: correction.document.metadata.title,
        })
        .returning({ id: storyLocalizations.id })

      if (!localization) {
        throw new Error(
          'Expected Story localization insertion to return an id.',
        )
      }

      await database.client.insert(storyLocalizations).values({
        deck: portugueseDraft.document.metadata.deck,
        hook: portugueseDraft.document.metadata.hook,
        locale: portugueseDraft.document.locale,
        preview: portugueseDraft.document.metadata.preview,
        readingMinutes: portugueseDraft.document.metadata.readingMinutes,
        slug: portugueseDraft.document.slug,
        state: 'draft',
        storyId: story.id,
        title: portugueseDraft.document.metadata.title,
      })

      const originalPublishedAt = original.document.publication.publishedAt
      const originalReviewedAt = original.document.editorial.reviewedAt
      const correctionPublishedAt = correction.document.publication.publishedAt
      const correctionReviewedAt = correction.document.editorial.reviewedAt
      if (
        !originalPublishedAt ||
        !originalReviewedAt ||
        !correctionPublishedAt ||
        !correctionReviewedAt
      ) {
        throw new Error(
          'Published fixture requires publication and review dates.',
        )
      }

      const [originalVersion] = await database.client
        .insert(storyVersions)
        .values({
          contentHash: original.contentHash,
          document: original.document,
          gitCommitSha: 'a'.repeat(40),
          localizationId: localization.id,
          publishedAt: new Date(originalPublishedAt),
          revision: original.document.revision,
          reviewedAt: new Date(originalReviewedAt),
          reviewedBy: original.document.editorial.reviewedBy,
          schemaVersion: original.document.schemaVersion,
        })
        .returning({ id: storyVersions.id })

      if (!originalVersion) {
        throw new Error(
          'Expected original Story version insertion to return an id.',
        )
      }

      const [correctedVersion] = await database.client
        .insert(storyVersions)
        .values({
          contentHash: correction.contentHash,
          document: correction.document,
          gitCommitSha: 'b'.repeat(40),
          localizationId: localization.id,
          previousVersionId: originalVersion.id,
          publishedAt: new Date(correctionPublishedAt),
          revision: correction.document.revision,
          reviewedAt: new Date(correctionReviewedAt),
          reviewedBy: correction.document.editorial.reviewedBy,
          schemaVersion: correction.document.schemaVersion,
        })
        .returning({ id: storyVersions.id })

      if (!correctedVersion) {
        throw new Error(
          'Expected corrected Story version insertion to return an id.',
        )
      }

      await database.client
        .update(storyLocalizations)
        .set({
          currentPublishedVersionId: correctedVersion.id,
          state: 'published',
        })
        .where(eq(storyLocalizations.id, localization.id))

      const unlockReader = await ensureIdentityAccount(
        database.client,
        'user_unlock_fixture',
        new Date('2026-09-20T10:06:00.000Z'),
      )
      const firstUnlockGrant = await grantCredits(database.client, {
        grantedAt: new Date('2026-09-20T10:06:10.000Z'),
        operationKey: 'seed:unlock-fifo-first',
        reason: 'First FIFO unlock fixture.',
        source: 'seed',
        sourceReference: 'unlock-fifo-first',
        units: 1,
        userId: unlockReader.userId,
      })
      const secondUnlockGrant = await grantCredits(database.client, {
        grantedAt: new Date('2026-09-20T10:06:20.000Z'),
        operationKey: 'seed:unlock-fifo-second',
        reason: 'Second FIFO unlock fixture.',
        source: 'seed',
        sourceReference: 'unlock-fifo-second',
        units: 2,
        userId: unlockReader.userId,
      })

      const repeatedUnlocks = await Promise.all([
        unlockStoryWithCredit(database.client, {
          now: new Date('2026-09-20T10:07:00.000Z'),
          operationKey: 'unlock:clockwork:user_unlock_fixture',
          storyId: story.id,
          userId: unlockReader.userId,
        }),
        unlockStoryWithCredit(database.client, {
          now: new Date('2026-09-20T10:07:00.000Z'),
          operationKey: 'unlock:clockwork:user_unlock_fixture',
          storyId: story.id,
          userId: unlockReader.userId,
        }),
      ])
      expect(repeatedUnlocks).toHaveLength(2)
      expect(
        new Set(repeatedUnlocks.map(({ operationId }) => operationId)).size,
      ).toBe(1)
      expect(
        new Set(repeatedUnlocks.map(({ entitlementId }) => entitlementId)).size,
      ).toBe(1)
      expect(repeatedUnlocks[0]).toMatchObject({
        availableCredits: 2,
        outcome: 'unlocked',
        walletVersion: 3,
      })

      await expect(
        unlockStoryWithCredit(database.client, {
          operationKey: 'unlock:clockwork:user_unlock_fixture:owned-retry',
          storyId: story.id,
          userId: unlockReader.userId,
        }),
      ).resolves.toMatchObject({
        availableCredits: 2,
        outcome: 'already_owned',
        walletEntryId: null,
        walletVersion: 3,
      })
      await expect(
        unlockStoryWithCredit(database.client, {
          operationKey: 'unlock:clockwork:user_unlock_fixture',
          storyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          userId: unlockReader.userId,
        }),
      ).rejects.toBeInstanceOf(UnlockOperationConflictError)
      await expect(
        unlockStoryWithCredit(database.client, {
          operationKey: 'unlock:unpublished:user_unlock_fixture',
          storyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          userId: unlockReader.userId,
        }),
      ).rejects.toBeInstanceOf(StoryUnlockUnavailableError)

      const [firstGrantAfterSpend] = await database.client
        .select({ unitsRemaining: creditGrants.unitsRemaining })
        .from(creditGrants)
        .where(eq(creditGrants.id, firstUnlockGrant.receipt.grantId))
        .limit(1)
      const [secondGrantAfterSpend] = await database.client
        .select({ unitsRemaining: creditGrants.unitsRemaining })
        .from(creditGrants)
        .where(eq(creditGrants.id, secondUnlockGrant.receipt.grantId))
        .limit(1)
      expect(firstGrantAfterSpend?.unitsRemaining).toBe(0)
      expect(secondGrantAfterSpend?.unitsRemaining).toBe(2)

      const unlockLedgerEntries = await database.client
        .select({
          delta: walletEntries.delta,
          id: walletEntries.id,
        })
        .from(walletEntries)
        .where(eq(walletEntries.entryType, 'spend'))
      expect(unlockLedgerEntries).toHaveLength(1)
      expect(unlockLedgerEntries[0]?.delta).toBe(-1)
      const allocations = await database.client
        .select({
          creditGrantId: creditSpendAllocations.creditGrantId,
          units: creditSpendAllocations.units,
        })
        .from(creditSpendAllocations)
        .where(
          eq(
            creditSpendAllocations.walletEntryId,
            repeatedUnlocks[0].walletEntryId ?? '',
          ),
        )
      expect(allocations).toEqual([
        { creditGrantId: firstUnlockGrant.receipt.grantId, units: 1 },
      ])
      await expect(
        client.query(
          `UPDATE credit_spend_allocations SET units = 2 WHERE wallet_entry_id = $1`,
          [repeatedUnlocks[0].walletEntryId],
        ),
      ).rejects.toThrow(/append-only/u)
      await expect(
        client.query(`DELETE FROM unlock_operations WHERE id = $1`, [
          repeatedUnlocks[0].operationId,
        ]),
      ).rejects.toThrow(/immutable/u)

      const operationCollisionReader = await ensureIdentityAccount(
        database.client,
        'user_unlock_operation_collision_fixture',
        new Date('2026-09-20T10:07:30.000Z'),
      )
      const operationCollisionGrant = await grantCredits(database.client, {
        operationKey: 'seed:unlock-operation-collision',
        reason: 'Cross-user operation-key fixture.',
        source: 'seed',
        units: 1,
        userId: operationCollisionReader.userId,
      })
      await expect(
        unlockStoryWithCredit(database.client, {
          operationKey: 'unlock:clockwork:user_unlock_fixture',
          storyId: story.id,
          userId: operationCollisionReader.userId,
        }),
      ).rejects.toBeInstanceOf(UnlockOperationConflictError)
      await expect(
        findWalletBalance(database.client, operationCollisionReader.userId),
      ).resolves.toEqual({ availableCredits: 1, version: 1 })

      const singleCreditReader = await ensureIdentityAccount(
        database.client,
        'user_single_credit_fixture',
        new Date('2026-09-20T10:08:00.000Z'),
      )
      await grantCredits(database.client, {
        operationKey: 'seed:single-credit-unlock',
        reason: 'Single-credit concurrency fixture.',
        source: 'seed',
        units: 1,
        userId: singleCreditReader.userId,
      })
      const competingUnlocks = await Promise.all([
        unlockStoryWithCredit(database.client, {
          operationKey: 'unlock:single-credit:first',
          storyId: story.id,
          userId: singleCreditReader.userId,
        }),
        unlockStoryWithCredit(database.client, {
          operationKey: 'unlock:single-credit:second',
          storyId: story.id,
          userId: singleCreditReader.userId,
        }),
      ])
      expect(competingUnlocks.map(({ outcome }) => outcome).sort()).toEqual([
        'already_owned',
        'unlocked',
      ])
      await expect(
        findWalletBalance(database.client, singleCreditReader.userId),
      ).resolves.toEqual({ availableCredits: 0, version: 2 })

      const noCreditReader = await ensureIdentityAccount(
        database.client,
        'user_no_credit_fixture',
        new Date('2026-09-20T10:09:00.000Z'),
      )
      await expect(
        unlockStoryWithCredit(database.client, {
          operationKey: 'unlock:no-credit',
          storyId: story.id,
          userId: noCreditReader.userId,
        }),
      ).rejects.toBeInstanceOf(InsufficientCreditsError)
      await expect(
        findWalletBalance(database.client, noCreditReader.userId),
      ).resolves.toEqual({ availableCredits: 0, version: 0 })
      const noCreditOperations = await database.client
        .select({ id: unlockOperations.id })
        .from(unlockOperations)
        .where(eq(unlockOperations.userId, noCreditReader.userId))
      expect(noCreditOperations).toHaveLength(0)
      const noCreditEntitlements = await database.client
        .select({ id: storyEntitlements.id })
        .from(storyEntitlements)
        .where(eq(storyEntitlements.userId, noCreditReader.userId))
      expect(noCreditEntitlements).toHaveLength(0)

      const found = await findPublishedStory(
        database.client,
        'clockwork-gardens',
        'en',
      )
      expect(found.status).toBe('found')
      if (found.status === 'found') {
        expect(found.story.contentHash).toBe(correction.contentHash)
        expect(found.story.document.revision).toBe(2)
      }

      await expect(
        findPublishedStory(database.client, 'clockwork-gardens', 'pt-PT'),
      ).resolves.toEqual({
        availableLocales: ['en'],
        status: 'missing_locale',
      })
      await expect(
        findPublishedStory(database.client, 'unknown-story', 'en'),
      ).resolves.toEqual({ status: 'not_found' })

      const routed = await findPublishedStoryBySlug(
        database.client,
        'en',
        'clockwork-gardens',
      )
      expect(routed.status).toBe('found')
      if (routed.status === 'found') {
        expect(routed.story.contentHash).toBe(correction.contentHash)
        expect(routed.availableLocalizations).toEqual([
          { locale: 'en', slug: 'clockwork-gardens' },
        ])
      }

      await expect(
        findEntitledStoryBySlug(
          database.client,
          linkedAccount.userId,
          'en',
          'clockwork-gardens',
        ),
      ).resolves.toEqual({ status: 'not_entitled' })

      const concurrentGrants = await Promise.all([
        grantStoryEntitlement(database.client, {
          actorUserId: linkedAccount.userId,
          grantedAt: new Date('2026-09-20T11:00:00.000Z'),
          reason: 'Synthetic Reader integration fixture.',
          source: 'seed',
          storyId: story.id,
          userId: linkedAccount.userId,
        }),
        grantStoryEntitlement(database.client, {
          actorUserId: linkedAccount.userId,
          grantedAt: new Date('2026-09-20T11:00:00.000Z'),
          reason: 'Duplicate synthetic Reader grant.',
          source: 'seed',
          storyId: story.id,
          userId: linkedAccount.userId,
        }),
      ])
      expect(concurrentGrants.filter(({ created }) => created)).toHaveLength(1)
      expect(
        new Set(concurrentGrants.map(({ entitlementId }) => entitlementId))
          .size,
      ).toBe(1)

      const grantEvents = await database.client
        .select({ reason: entitlementEvents.reason })
        .from(entitlementEvents)
        .where(
          eq(
            entitlementEvents.entitlementId,
            concurrentGrants[0].entitlementId,
          ),
        )
      expect(grantEvents).toHaveLength(1)

      const entitled = await findEntitledStoryBySlug(
        database.client,
        linkedAccount.userId,
        'en',
        'clockwork-gardens',
      )
      expect(entitled.status).toBe('found')
      if (entitled.status === 'found') {
        expect(entitled.story.document.blocks).toHaveLength(3)
        expect(entitled.story.document.blocks[1]).toMatchObject({
          id: 'correction-context',
          kind: 'source_note',
        })
      }

      const otherReader = await ensureIdentityAccount(
        database.client,
        'user_other_reader_fixture',
        new Date('2026-09-20T11:01:00.000Z'),
      )
      await expect(
        findEntitledStoryBySlug(
          database.client,
          otherReader.userId,
          'en',
          'clockwork-gardens',
        ),
      ).resolves.toEqual({ status: 'not_entitled' })

      const revisedProgress = await saveReadingProgress(database.client, {
        clientSequence: 1,
        endMarkerReached: false,
        locale: 'en',
        now: new Date('2026-09-20T11:01:30.000Z'),
        resumeBlockId: 'mechanism-diagram',
        resumeOffset: original.readingUnits['mechanism-diagram'] ?? 0,
        storyId: story.id,
        userId: linkedAccount.userId,
        versionId: originalVersion.id,
      })
      expect(revisedProgress.status).toBe('found')
      if (revisedProgress.status === 'found') {
        expect(revisedProgress.accepted).toBe(true)
        expect(revisedProgress.progress).toMatchObject({
          lastClientSequence: 1,
          resumeBlockId: 'opening',
          versionId: correctedVersion.id,
        })
        expect(revisedProgress.progress.resumeOffset).toBe(
          correction.readingUnits.opening,
        )
      }

      const completedProgress = await saveReadingProgress(database.client, {
        clientSequence: 2,
        endMarkerReached: true,
        locale: 'en',
        now: new Date('2026-09-20T11:01:40.000Z'),
        resumeBlockId: 'story-end',
        resumeOffset: correction.readingUnits['story-end'] ?? 0,
        storyId: story.id,
        userId: linkedAccount.userId,
        versionId: correctedVersion.id,
      })
      expect(completedProgress).toMatchObject({
        accepted: true,
        progress: {
          completedAt: '2026-09-20T11:01:40.000Z',
          highWaterPercent: 100,
          lastClientSequence: 2,
        },
        status: 'found',
      })

      const staleProgress = await saveReadingProgress(database.client, {
        clientSequence: 2,
        endMarkerReached: false,
        locale: 'en',
        resumeBlockId: 'opening',
        resumeOffset: 0,
        storyId: story.id,
        userId: linkedAccount.userId,
        versionId: correctedVersion.id,
      })
      expect(staleProgress).toMatchObject({
        accepted: false,
        progress: { highWaterPercent: 100, lastClientSequence: 2 },
        status: 'found',
      })

      await Promise.all([
        saveReadingProgress(database.client, {
          clientSequence: 4,
          endMarkerReached: false,
          locale: 'en',
          resumeBlockId: 'correction-context',
          resumeOffset: 1,
          storyId: story.id,
          userId: linkedAccount.userId,
          versionId: correctedVersion.id,
        }),
        saveReadingProgress(database.client, {
          clientSequence: 3,
          endMarkerReached: false,
          locale: 'en',
          resumeBlockId: 'opening',
          resumeOffset: 0,
          storyId: story.id,
          userId: linkedAccount.userId,
          versionId: correctedVersion.id,
        }),
      ])
      await expect(
        findReadingProgress(database.client, {
          currentStory: correction,
          currentVersionId: correctedVersion.id,
          locale: 'en',
          storyId: story.id,
          userId: linkedAccount.userId,
        }),
      ).resolves.toMatchObject({
        completedAt: '2026-09-20T11:01:40.000Z',
        highWaterPercent: 100,
        lastClientSequence: 4,
        resumeBlockId: 'correction-context',
      })

      await expect(
        saveReadingProgress(database.client, {
          clientSequence: 1,
          endMarkerReached: false,
          locale: 'en',
          resumeBlockId: 'opening',
          resumeOffset: 0,
          storyId: story.id,
          userId: otherReader.userId,
          versionId: correctedVersion.id,
        }),
      ).resolves.toEqual({ status: 'not_entitled' })

      const revoked = await revokeStoryEntitlement(database.client, {
        actorUserId: linkedAccount.userId,
        entitlementId: concurrentGrants[0].entitlementId,
        reason: 'Synthetic revocation evidence.',
        revokedAt: new Date('2026-09-20T11:02:00.000Z'),
      })
      expect(revoked).toMatchObject({ changed: true, status: 'revoked' })
      await expect(
        revokeStoryEntitlement(database.client, {
          actorUserId: linkedAccount.userId,
          entitlementId: revoked.entitlementId,
          reason: 'Duplicate synthetic revocation.',
          revokedAt: new Date('2026-09-20T11:02:00.000Z'),
        }),
      ).resolves.toEqual({
        changed: false,
        entitlementId: revoked.entitlementId,
        status: 'revoked',
      })
      await expect(
        findEntitledStoryBySlug(
          database.client,
          linkedAccount.userId,
          'en',
          'clockwork-gardens',
        ),
      ).resolves.toEqual({ status: 'not_entitled' })
      await expect(
        saveReadingProgress(database.client, {
          clientSequence: 5,
          endMarkerReached: false,
          locale: 'en',
          resumeBlockId: 'opening',
          resumeOffset: 0,
          storyId: story.id,
          userId: linkedAccount.userId,
          versionId: correctedVersion.id,
        }),
      ).resolves.toEqual({ status: 'not_entitled' })

      const entitlementHistory = await database.client
        .select({ eventType: entitlementEvents.eventType })
        .from(entitlementEvents)
        .where(
          eq(
            entitlementEvents.entitlementId,
            concurrentGrants[0].entitlementId,
          ),
        )
      expect(
        entitlementHistory.map(({ eventType }) => eventType).sort(),
      ).toEqual(['granted', 'revoked'])

      await expect(
        findPublishedStoryBySlug(database.client, 'pt-PT', 'clockwork-gardens'),
      ).resolves.toEqual({
        availableLocalizations: [{ locale: 'en', slug: 'clockwork-gardens' }],
        status: 'missing_locale',
      })
      await expect(
        findPublishedStoryBySlug(
          database.client,
          'pt-PT',
          'jardins-de-relogio',
        ),
      ).resolves.toEqual({ status: 'not_found' })

      const firstReconciliationBatch = await reconcileWallets(database.client, {
        limit: 1,
      })
      expect(firstReconciliationBatch).toMatchObject({
        checkedWallets: 1,
        discrepancies: [],
        healthy: true,
      })
      expect(firstReconciliationBatch.nextWalletId).toEqual(expect.any(String))
      if (!firstReconciliationBatch.nextWalletId) {
        throw new Error('Expected a second reconciliation batch.')
      }
      await expect(
        reconcileWallets(database.client, {
          afterWalletId: firstReconciliationBatch.nextWalletId,
          limit: 1,
        }),
      ).resolves.toMatchObject({ checkedWallets: 1, healthy: true })

      const healthyReconciliation = await reconcileWallets(database.client)
      expect(healthyReconciliation).toMatchObject({
        discrepancies: [],
        healthy: true,
        nextWalletId: null,
      })
      expect(healthyReconciliation.checkedWallets).toBeGreaterThanOrEqual(4)

      const firstHistoryPage = await findWalletHistory(
        database.client,
        unlockReader.userId,
        { limit: 2 },
      )
      expect(firstHistoryPage.balance).toEqual({
        availableCredits: 2,
        version: 3,
      })
      expect(
        firstHistoryPage.transactions.map(({ credits, kind }) => ({
          credits,
          kind,
        })),
      ).toEqual([
        { credits: -1, kind: 'story_unlocked' },
        { credits: 2, kind: 'credit_added' },
      ])
      expect(firstHistoryPage.transactions[0]).toMatchObject({
        storyId: story.id,
      })
      expect(firstHistoryPage.nextCursor).toEqual(expect.any(String))
      expect(firstHistoryPage.transactions[0]).not.toHaveProperty(
        'operationKey',
      )
      expect(firstHistoryPage.transactions[0]).not.toHaveProperty('reason')
      expect(firstHistoryPage.transactions[0]).not.toHaveProperty('actorUserId')
      if (!firstHistoryPage.nextCursor) {
        throw new Error('Expected a second wallet-history page.')
      }

      const secondHistoryPage = await findWalletHistory(
        database.client,
        unlockReader.userId,
        { cursor: firstHistoryPage.nextCursor, limit: 2 },
      )
      expect(secondHistoryPage.transactions).toHaveLength(1)
      expect(secondHistoryPage.transactions[0]).toMatchObject({
        credits: 1,
        kind: 'credit_added',
        source: 'seed',
      })
      expect(secondHistoryPage.nextCursor).toBeNull()
      const isolatedHistory = await findWalletHistory(
        database.client,
        operationCollisionReader.userId,
      )
      expect(isolatedHistory).toMatchObject({
        balance: { availableCredits: 1, version: 1 },
        transactions: [{ credits: 1, kind: 'credit_added' }],
      })
      expect(isolatedHistory.transactions).toHaveLength(1)
      expect(isolatedHistory.transactions[0]?.id).not.toBe(
        firstHistoryPage.transactions[0]?.id,
      )
      await expect(
        findWalletHistory(database.client, otherReader.userId),
      ).resolves.toEqual({
        balance: { availableCredits: 0, version: 0 },
        nextCursor: null,
        transactions: [],
      })
      await expect(
        findWalletHistory(database.client, unlockReader.userId, {
          cursor: 'not-an-opaque-wallet-cursor',
        }),
      ).rejects.toThrow(/cursor is invalid/u)

      const corruptReader = await ensureIdentityAccount(
        database.client,
        'user_reconciliation_corrupt_fixture',
        new Date('2026-09-20T12:00:00.000Z'),
      )
      const corruptGrant = await grantCredits(database.client, {
        grantedAt: new Date('2026-09-20T12:00:10.000Z'),
        operationKey: 'seed:reconciliation-corrupt',
        reason: 'Reconciliation classification fixture.',
        source: 'seed',
        units: 3,
        userId: corruptReader.userId,
      })
      const [corruptWallet] = await database.client
        .select({ id: walletAccounts.id })
        .from(walletAccounts)
        .where(eq(walletAccounts.userId, corruptReader.userId))
        .limit(1)
      if (!corruptWallet) {
        throw new Error('Expected corrupt reconciliation wallet fixture.')
      }
      await database.client
        .update(walletAccounts)
        .set({ balanceCached: 99, version: 99 })
        .where(eq(walletAccounts.id, corruptWallet.id))
      await database.client
        .update(creditGrants)
        .set({ unitsRemaining: 1 })
        .where(eq(creditGrants.id, corruptGrant.receipt.grantId))
      const [orphanGrant] = await database.client
        .insert(creditGrants)
        .values({
          operationKey: 'seed:orphan-reconciliation-grant',
          reason: 'Deliberate missing-ledger fixture.',
          source: 'seed',
          unitsGranted: 1,
          unitsRemaining: 1,
          walletAccountId: corruptWallet.id,
        })
        .returning({ id: creditGrants.id })
      if (!orphanGrant) {
        throw new Error('Expected orphan grant reconciliation fixture.')
      }
      const [unallocatedSpend] = await database.client
        .insert(walletEntries)
        .values({
          balanceAfter: 97,
          delta: -2,
          entryType: 'spend',
          occurredAt: new Date('2026-09-20T12:00:20.000Z'),
          operationKey: 'unlock:reconciliation-corrupt',
          reason: 'Deliberate allocation mismatch fixture.',
          walletAccountId: corruptWallet.id,
          walletVersion: 4,
        })
        .returning({ id: walletEntries.id })
      if (!unallocatedSpend) {
        throw new Error('Expected unallocated spend reconciliation fixture.')
      }
      await database.client.insert(creditSpendAllocations).values({
        creditGrantId: operationCollisionGrant.receipt.grantId,
        units: 1,
        walletEntryId: unallocatedSpend.id,
      })
      const corruptEntitlement = await grantStoryEntitlement(database.client, {
        reason: 'Deliberate missing-unlock-operation fixture.',
        source: 'unlock',
        storyId: story.id,
        userId: corruptReader.userId,
      })
      await database.client.insert(unlockOperations).values({
        balanceAfter: 99,
        entitlementId: repeatedUnlocks[0].entitlementId,
        operationKey: 'unlock:reconciliation-mismatched-operation',
        outcome: 'already_owned',
        storyId: story.id,
        userId: corruptReader.userId,
        walletVersion: 99,
      })

      const corruptReconciliation = await reconcileWallets(database.client, {
        userId: corruptReader.userId,
      })
      expect(corruptReconciliation.healthy).toBe(false)
      expect(
        new Set(corruptReconciliation.discrepancies.map(({ code }) => code)),
      ).toEqual(
        new Set([
          'allocation_wallet_mismatch',
          'credit_grant_ledger_mismatch',
          'credit_grant_remaining_mismatch',
          'entitlement_unlock_mismatch',
          'spend_allocation_mismatch',
          'unlock_operation_mismatch',
          'wallet_balance_mismatch',
          'wallet_entry_running_balance_mismatch',
          'wallet_entry_version_mismatch',
          'wallet_version_mismatch',
        ]),
      )
      expect(
        corruptReconciliation.discrepancies.some(
          ({ entityId }) => entityId === corruptEntitlement.entitlementId,
        ),
      ).toBe(true)
      await expect(
        assertWalletsReconciled(database.client, {
          userId: corruptReader.userId,
        }),
      ).rejects.toBeInstanceOf(WalletReconciliationError)
    } finally {
      await client.end()
      await database.pool.end()
      await stopDatabase()
    }
  }, 60_000)
})
