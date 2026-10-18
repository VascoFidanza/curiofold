import {
  createDatabase,
  captureRecoveryRestrictions,
  reapplyRecoveryRestrictions,
  verifyRecoveryPrivacy,
} from '@curiofold/db'

/** Privileged nonproduction operator command. Traffic/workers must remain disabled. */
async function main() {
  const source = new URL(process.env.CURIOFOLD_RECOVERY_SOURCE_URL ?? '')
  const target = new URL(process.env.CURIOFOLD_RECOVERY_TARGET_URL ?? '')
  const secret = process.env.CLERK_SECRET_KEY
  if (
    process.env.CURIOFOLD_RECOVERY_CONFIRMATION !==
      'isolated-nonproduction-writes-frozen' ||
    !secret?.startsWith('sk_test_') ||
    ![
      'ep-dark-unit-b1s7k5cz.c-5.eu-central-1.aws.neon.tech',
      'ep-dark-unit-b1s7k5cz-pooler.c-5.eu-central-1.aws.neon.tech',
    ].includes(source.hostname) ||
    source.pathname !== '/curiofold' ||
    target.hostname !== '127.0.0.1' ||
    target.pathname !== '/curiofold_recovery' ||
    !target.port
  )
    throw new Error('Isolated nonproduction recovery configuration required')
  source.searchParams.set('sslmode', 'verify-full')
  const current = createDatabase(source.toString())
  const restored = createDatabase(target.toString())
  try {
    const call = async (path: string, method = 'GET') => {
      const response = await fetch(`https://api.clerk.com/v1${path}`, {
        method,
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(10_000),
      })
      if (response.status === 404) return null
      if (!response.ok) throw new Error('Recovery identity coordination failed')
      return (await response.json()) as unknown
    }
    await reapplyRecoveryRestrictions(
      restored.client,
      await captureRecoveryRestrictions(current.client),
      async (subject) => {
        if (!(await call(`/users/${encodeURIComponent(subject)}/ban`, 'POST')))
          return
        for (let page = 0; page < 100; page++) {
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
        throw new Error('Recovery session revocation incomplete')
      },
    )
    await verifyRecoveryPrivacy(current.client, restored.client)
    console.info(JSON.stringify({ recoveryPrivacyVerified: true }))
  } finally {
    await current.pool.end()
    await restored.pool.end()
  }
}

main().catch(() => {
  console.error(
    'Recovery privacy remediation failed; keep restored traffic closed and retry after operator review.',
  )
  process.exitCode = 1
})
