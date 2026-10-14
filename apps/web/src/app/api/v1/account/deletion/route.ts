import { requestAccountDeletion } from '@curiofold/db'

import { getDatabase } from '@/server/database'
import {
  IdentitySessionError,
  requireAuthorizationContext,
} from '@/server/identity'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const reply = (status: number, code: string) =>
    Response.json(
      { code },
      { status, headers: { 'Cache-Control': 'private, no-store' } },
    )
  if (
    request.headers.get('origin') !== new URL(request.url).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    return reply(403, 'untrusted_origin')
  if (
    request.headers.get('content-type') !== 'application/json' ||
    Number(request.headers.get('content-length')) > 128
  )
    return reply(400, 'invalid_confirmation')
  let body: string
  try {
    body = await request.text()
  } catch {
    return reply(400, 'invalid_confirmation')
  }
  if (body.length > 128) return reply(400, 'invalid_confirmation')
  try {
    if (
      JSON.stringify(JSON.parse(body)) !==
      JSON.stringify({ confirmation: 'DELETE' })
    )
      return reply(400, 'invalid_confirmation')
  } catch {
    return reply(400, 'invalid_confirmation')
  }
  try {
    const account = await requireAuthorizationContext()
    const age = account.firstFactorVerifiedAt
      ? Date.now() - account.firstFactorVerifiedAt.getTime()
      : Infinity
    if (!account.emailVerified || age < -5000 || age > 15 * 60_000)
      return reply(403, 'recent_sign_in_required')
    await requestAccountDeletion(getDatabase().client, account.userId)
    return reply(202, 'deletion_accepted')
  } catch (error) {
    if (error instanceof IdentitySessionError)
      return reply(error.code === 'unauthenticated' ? 401 : 403, error.code)
    return reply(503, 'deletion_unavailable')
  }
}
