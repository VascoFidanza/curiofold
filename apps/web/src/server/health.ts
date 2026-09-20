import { getDatabase } from './database'

export interface ReadinessCheck {
  check: () => Promise<void>
  name: string
}

export interface ReadinessResult {
  checks: { name: string; status: 'ready' | 'unavailable' }[]
  status: 'not_ready' | 'ready'
}

export async function evaluateReadiness(
  checks: readonly ReadinessCheck[],
): Promise<ReadinessResult> {
  const results = await Promise.all(
    checks.map(async (readinessCheck) => {
      try {
        await readinessCheck.check()
        return { name: readinessCheck.name, status: 'ready' as const }
      } catch {
        return { name: readinessCheck.name, status: 'unavailable' as const }
      }
    }),
  )

  return {
    checks: results,
    status: results.every(({ status }) => status === 'ready')
      ? 'ready'
      : 'not_ready',
  }
}

export async function checkDatabaseReadiness(): Promise<void> {
  const database = getDatabase()
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Database readiness timed out.'))
    }, 1_500)
    timer.unref()
  })

  try {
    await Promise.race([database.pool.query('select 1'), timeout])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}

export function readinessResponse(result: ReadinessResult): Response {
  return Response.json(result, {
    status: result.status === 'ready' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  })
}
