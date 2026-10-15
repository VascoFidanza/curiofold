import { runAccountDeletionBatch } from '@/server/account-deletion-worker'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return Response.json({ code: 'unauthorized' }, { status: 401 })
  try {
    return Response.json(await runAccountDeletionBatch(), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json(
      { code: 'deletion_worker_unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
