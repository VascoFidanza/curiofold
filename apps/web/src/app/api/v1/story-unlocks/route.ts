import { observeRoute } from '@/server/observability'
import { createStoryUnlockResponse } from '@/server/story-unlock-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  return observeRoute(request, '/api/v1/story-unlocks', ({ requestId }) =>
    createStoryUnlockResponse(request, requestId),
  )
}
