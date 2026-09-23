import {
  findWalletHistory,
  InvalidWalletHistoryCursorError,
  type WalletHistoryPage,
} from '@curiofold/db'

import { getDatabase } from './database'
import { IdentitySessionError, requireAuthorizationContext } from './identity'

type AuthorizationSource = typeof requireAuthorizationContext
type WalletHistorySource = (
  userId: string,
  input: { readonly cursor?: string; readonly limit?: number },
) => Promise<WalletHistoryPage>

interface WalletRouteDependencies {
  readonly authorizationSource?: AuthorizationSource
  readonly historySource?: WalletHistorySource
}

function problem(
  status: number,
  code: string,
  title: string,
  requestId: string,
  headers: HeadersInit = {},
): Response {
  const responseHeaders = new Headers(headers)
  responseHeaders.set('Cache-Control', 'no-store')
  responseHeaders.set('Content-Type', 'application/problem+json')
  return Response.json(
    { type: 'about:blank', title, status, code, requestId },
    { status, headers: responseHeaders },
  )
}

function readQuery(
  request: Request,
): { readonly cursor?: string; readonly limit?: number } | null {
  const searchParams = new URL(request.url).searchParams
  if (
    [...searchParams.keys()].some(
      (key) => key !== 'cursor' && key !== 'limit',
    ) ||
    searchParams.getAll('cursor').length > 1 ||
    searchParams.getAll('limit').length > 1
  ) {
    return null
  }

  const cursor = searchParams.get('cursor') ?? undefined
  const rawLimit = searchParams.get('limit')
  if (cursor !== undefined && (!cursor || cursor.length > 1_000)) {
    return null
  }
  if (rawLimit !== null && !/^[1-9][0-9]{0,2}$/u.test(rawLimit)) {
    return null
  }
  const limit = rawLimit === null ? undefined : Number(rawLimit)
  if (limit !== undefined && limit > 100) {
    return null
  }
  return {
    ...(cursor ? { cursor } : {}),
    ...(limit ? { limit } : {}),
  }
}

export async function createWalletResponse(
  request: Request,
  requestId: string,
  dependencies: WalletRouteDependencies = {},
): Promise<Response> {
  let authorization
  try {
    authorization = await (
      dependencies.authorizationSource ?? requireAuthorizationContext
    )()
  } catch (error) {
    if (!(error instanceof IdentitySessionError)) {
      throw error
    }
    if (error.code === 'identity_unavailable') {
      return problem(
        503,
        'identity_unavailable',
        'Identity service unavailable',
        requestId,
        { 'Retry-After': '60' },
      )
    }
    if (error.code === 'unauthenticated') {
      return problem(
        401,
        'unauthenticated',
        'Authentication required',
        requestId,
        { 'WWW-Authenticate': 'Clerk' },
      )
    }
    return problem(
      403,
      'account_disabled',
      'Account access disabled',
      requestId,
    )
  }

  const query = readQuery(request)
  if (!query) {
    return problem(
      400,
      'invalid_wallet_query',
      'Wallet query is invalid',
      requestId,
    )
  }

  try {
    const history = await (
      dependencies.historySource ??
      ((userId, input) =>
        findWalletHistory(getDatabase().client, userId, input))
    )(authorization.userId, query)
    return Response.json(history, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    if (error instanceof InvalidWalletHistoryCursorError) {
      return problem(
        400,
        'invalid_wallet_cursor',
        'Wallet cursor is invalid',
        requestId,
      )
    }
    throw error
  }
}
