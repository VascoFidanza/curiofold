import { observeRoute } from '@/server/observability'
import { createReadingProgressResponse } from '@/server/reading-progress-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface ReadingProgressRouteContext {
  readonly params: Promise<{
    locale: string
    storyId: string
  }>
}

export async function PUT(
  request: Request,
  context: ReadingProgressRouteContext,
): Promise<Response> {
  return observeRoute(
    request,
    '/api/v1/reading-progress/[storyId]/[locale]',
    async ({ requestId }) =>
      createReadingProgressResponse(request, await context.params, requestId),
  )
}
