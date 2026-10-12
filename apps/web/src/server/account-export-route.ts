import { exportAccountData } from '@curiofold/db'

import { getDatabase } from './database'
import { IdentitySessionError, requireAuthorizationContext } from './identity'

interface ExportDependencies {
  authorizationSource?: typeof requireAuthorizationContext
  exportSource?: (userId: string) => Promise<unknown>
}

export async function createAccountExportResponse(
  request: Request,
  requestId: string,
  dependencies: ExportDependencies = {},
): Promise<Response> {
  const problem = (status: number, code: string) =>
    Response.json(
      {
        type: 'about:blank',
        title: 'Account export unavailable',
        status,
        code,
        requestId,
      },
      {
        status,
        headers: {
          'Cache-Control': 'private, no-store',
          'Content-Type': 'application/problem+json',
        },
      },
    )
  let authorization
  try {
    authorization = await (
      dependencies.authorizationSource ?? requireAuthorizationContext
    )()
  } catch (error) {
    if (!(error instanceof IdentitySessionError)) throw error
    return problem(
      error.code === 'unauthenticated'
        ? 401
        : error.code === 'identity_unavailable'
          ? 503
          : 403,
      error.code,
    )
  }
  if (authorization.accountState !== 'active')
    return problem(403, 'account_disabled')
  if (!authorization.emailVerified)
    return problem(403, 'email_verification_required')
  if (new URL(request.url).search) return problem(400, 'invalid_export_query')
  const data = await (
    dependencies.exportSource ??
    ((userId) => exportAccountData(getDatabase().client, userId))
  )(authorization.userId)
  return Response.json(data, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition':
        'attachment; filename="curiofold-account-data.json"',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
