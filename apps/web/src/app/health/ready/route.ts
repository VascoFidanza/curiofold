import {
  checkDatabaseReadiness,
  evaluateReadiness,
  readinessResponse,
} from '@/server/health'
import { observeRoute, runtimeLogger } from '@/server/observability'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function GET(request: Request): Promise<Response> {
  return observeRoute(request, '/health/ready', async ({ requestId }) => {
    const result = await evaluateReadiness([
      { name: 'database', check: checkDatabaseReadiness },
    ])
    for (const check of result.checks) {
      if (check.status === 'unavailable') {
        runtimeLogger.warn('health.dependency.unavailable', {
          dependency: check.name,
          requestId,
          route: '/health/ready',
        })
      }
    }
    return readinessResponse(result)
  })
}
