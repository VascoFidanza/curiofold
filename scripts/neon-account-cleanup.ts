import { createDatabase } from '../packages/db/src/client'
import { processAccountDeletions } from '../packages/db/src/account-deletion'

let database: ReturnType<typeof createDatabase> | undefined

export default {
  async fetch(request: Request): Promise<Response> {
    // Neon strips client-supplied x-neon-* headers at its public proxy.
    const invocationId = request.headers.get('x-neon-trigger-invocation-id')
    if (request.method !== 'POST' || !invocationId)
      return new Response(null, { status: 401 })
    let body: {
      version?: number
      invocation_id?: string
      trigger?: { type?: string; name?: string }
    }
    try {
      body = (await request.json()) as typeof body
    } catch {
      return new Response(null, { status: 400 })
    }
    if (
      !body ||
      body.version !== 1 ||
      body.invocation_id !== invocationId ||
      body.trigger?.type !== 'schedule' ||
      body.trigger.name !== 'curiofold-account-cleanup'
    )
      return new Response(null, { status: 401 })
    const secretKey = process.env.CLERK_SECRET_KEY
    const connection = process.env.CURIOFOLD_DATABASE_URL
    let validDatabase = false
    try {
      validDatabase =
        !!connection && new URL(connection).pathname === '/curiofold'
    } catch {
      // Invalid configuration must not expose a credential-bearing URL in logs.
    }
    if (
      process.env.CURIOFOLD_ENVIRONMENT !== 'nonproduction' ||
      !secretKey?.startsWith('sk_test_') ||
      !connection ||
      !validDatabase
    )
      return Response.json(
        { code: 'nonproduction_configuration_required' },
        { status: 503 },
      )
    try {
      if (!database) {
        database = createDatabase(connection)
        // A restored/restarted compute can disconnect idle clients. pg requires
        // a listener to avoid terminating the worker; never log the raw error.
        database.pool.on('error', () => {
          console.error(JSON.stringify({ event: 'account_cleanup_pool_error' }))
        })
      }
      const result = await processAccountDeletions(
        database.client,
        async (subject) => {
          const call = async (path: string, method = 'GET') => {
            const response = await fetch(`https://api.clerk.com/v1${path}`, {
              method,
              headers: { Authorization: `Bearer ${secretKey}` },
              signal: AbortSignal.timeout(10_000),
            })
            if (response.status === 404) return null
            if (!response.ok) throw new Error('Identity provider unavailable')
            return (await response.json()) as unknown
          }
          const banned = await call(
            `/users/${encodeURIComponent(subject)}/ban`,
            'POST',
          )
          if (!banned) return // Already deleted at the provider; access cannot resume.
          for (let page = 0; page < 100; page += 1) {
            const sessions = (await call(
              `/sessions?user_id=${encodeURIComponent(subject)}&status=active&limit=100`,
            )) as { id: string }[] | null
            if (!sessions?.length) return
            for (const session of sessions)
              await call(
                `/sessions/${encodeURIComponent(session.id)}/revoke`,
                'POST',
              )
          }
          throw new Error('Session revocation incomplete')
        },
      )
      console.info(
        JSON.stringify({
          event: 'account_cleanup_batch',
          invocationId,
          ...result,
        }),
      )
      return Response.json(result, { status: result.failed ? 503 : 200 })
    } catch {
      console.error(
        JSON.stringify({ event: 'account_cleanup_unavailable', invocationId }),
      )
      return Response.json({ code: 'cleanup_unavailable' }, { status: 503 })
    }
  },
}
