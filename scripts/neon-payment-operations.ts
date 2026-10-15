import {
  createDatabase,
  readPaymentOperationsHealth,
  recordPaymentOperationsRun,
  reconcileWallets,
  type PaymentOperationsCode,
} from '../packages/db/src/index'
import { runPaymentReconciliationBatch } from '../apps/web/src/server/payment-reconciliation-worker'
import { createStripePaymentProvider } from '../apps/web/src/server/stripe-payment-provider'

let database: ReturnType<typeof createDatabase> | undefined
const headers = { 'Cache-Control': 'no-store' }

export default {
  async fetch(request: Request): Promise<Response> {
    const health =
      request.method === 'GET' && new URL(request.url).pathname === '/health'
    if (!health) {
      const invocation = request.headers.get('x-neon-trigger-invocation-id')
      if (request.method !== 'POST' || !invocation)
        return new Response(null, { status: 401 })
      const body = (await request.json().catch(() => null)) as {
        version?: number
        invocation_id?: string
        trigger?: { type?: string; name?: string }
      } | null
      if (
        body?.version !== 1 ||
        body.invocation_id !== invocation ||
        body.trigger?.type !== 'schedule' ||
        body.trigger.name !== 'curiofold-payment-operations'
      )
        return new Response(null, { status: 401 })
    }
    const key = process.env.STRIPE_SECRET_KEY
    const connection = process.env.CURIOFOLD_DATABASE_URL
    let valid = false
    try {
      valid =
        process.env.CURIOFOLD_ENVIRONMENT === 'nonproduction' &&
        !!key?.startsWith('sk_test_') &&
        !!connection &&
        new URL(connection).pathname === '/curiofold' &&
        [
          'ep-dark-unit-b1s7k5cz.c-5.eu-central-1.aws.neon.tech',
          'ep-dark-unit-b1s7k5cz-pooler.c-5.eu-central-1.aws.neon.tech',
        ].includes(new URL(connection).hostname)
    } catch {
      /* Fail closed without exposing the malformed secret. */
    }
    if (!valid || !connection || !key)
      return Response.json(
        { code: 'nonproduction_configuration_required' },
        { status: 503, headers },
      )
    try {
      if (!database) {
        const secureConnection = new URL(connection)
        secureConnection.searchParams.set('sslmode', 'verify-full')
        database = createDatabase(secureConnection.toString())
        database.pool.on('error', () =>
          console.error(
            JSON.stringify({ event: 'payment_operations_pool_error' }),
          ),
        )
      }
      if (!health) {
        const codes: PaymentOperationsCode[] = []
        try {
          await runPaymentReconciliationBatch({
            database: database.client,
            limit: 5,
            leaseForMs: 300_000,
            provider: createStripePaymentProvider({
              appUrl:
                'https://curiofold-git-development-vascofidanzas-projects.vercel.app',
              secretKey: key,
              requestTimeoutMs: 10_000,
              maxNetworkRetries: 0,
            }),
          })
          // One consistent snapshot avoids false discrepancies during concurrent purchases.
          await database.client.transaction(
            async (transaction) => {
              let cursor: string | undefined
              for (let page = 0; page < 10; page += 1) {
                const audit = await reconcileWallets(transaction, {
                  limit: 100,
                  ...(cursor ? { afterWalletId: cursor } : {}),
                })
                if (!audit.healthy && !codes.includes('wallet_discrepancy'))
                  codes.push('wallet_discrepancy')
                if (!audit.nextWalletId) return
                cursor = audit.nextWalletId
              }
              codes.push('audit_incomplete')
            },
            { isolationLevel: 'repeatable read', accessMode: 'read only' },
          )
        } catch {
          codes.push('worker_failed')
        }
        await recordPaymentOperationsRun(database.client, codes)
      }
      const status = await readPaymentOperationsHealth(database.client)
      if (!health)
        (status.healthy ? console.info : console.error)(
          JSON.stringify({ event: 'payment_operations_run', ...status }),
        )
      // Public probe reveals only bounded diagnostic codes, never identifiers/counts.
      return Response.json(status, {
        status: status.healthy ? 200 : 503,
        headers,
      })
    } catch {
      console.error(JSON.stringify({ event: 'payment_operations_unavailable' }))
      return Response.json(
        { healthy: false, codes: ['worker_unavailable'] },
        { status: 503, headers },
      )
    }
  },
}
