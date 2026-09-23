import { can, type AuthorizationContext } from '@curiofold/domain'
import {
  InsufficientCreditsError,
  StoryUnlockUnavailableError,
  UnlockOperationConflictError,
  unlockStoryWithCredit,
  type UnlockStoryInput,
  type UnlockStoryResult,
} from '@curiofold/db'

import { getDatabase } from './database'
import { IdentitySessionError, requireAuthorizationContext } from './identity'

type AuthorizationSource = () => Promise<AuthorizationContext>
type UnlockSource = (input: UnlockStoryInput) => Promise<UnlockStoryResult>

interface StoryUnlockDependencies {
  readonly authorizationSource?: AuthorizationSource
  readonly unlockSource?: UnlockSource
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const maximumPayloadBytes = 2_048
const maximumOperationKeyLength = 200

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

function hasTrustedOrigin(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return false
  }

  const origin = request.headers.get('origin')
  if (!origin) {
    return true
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

function readOperationKey(request: Request): string | null {
  const operationKey = request.headers.get('idempotency-key')?.trim()
  if (
    !operationKey ||
    operationKey.length > maximumOperationKeyLength ||
    Array.from(operationKey).some((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      return codePoint <= 31 || codePoint === 127
    })
  ) {
    return null
  }
  return operationKey
}

async function readStoryId(request: Request): Promise<string | null> {
  const mediaType = request.headers
    .get('content-type')
    ?.split(';', 1)[0]
    ?.trim()
    .toLowerCase()
  if (mediaType !== 'application/json') {
    return null
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > maximumPayloadBytes) {
    return null
  }

  try {
    const text = await request.text()
    if (new TextEncoder().encode(text).byteLength > maximumPayloadBytes) {
      return null
    }
    const value = JSON.parse(text) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null
    }
    const candidate = value as Record<string, unknown>
    if (
      Object.keys(candidate).length !== 1 ||
      typeof candidate.storyId !== 'string' ||
      !uuidPattern.test(candidate.storyId)
    ) {
      return null
    }
    return candidate.storyId
  } catch {
    return null
  }
}

export async function createStoryUnlockResponse(
  request: Request,
  requestId: string,
  dependencies: StoryUnlockDependencies = {},
): Promise<Response> {
  if (!hasTrustedOrigin(request)) {
    return problem(
      403,
      'cross_origin',
      'Cross-origin request denied',
      requestId,
    )
  }

  const operationKey = readOperationKey(request)
  if (!operationKey) {
    return problem(
      400,
      'invalid_idempotency_key',
      'A valid Idempotency-Key header is required',
      requestId,
    )
  }

  let authorization: AuthorizationContext
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

  if (!can(authorization, 'story.unlock')) {
    return problem(
      403,
      'email_verification_required',
      'Verified email required',
      requestId,
    )
  }

  const storyId = await readStoryId(request)
  if (!storyId) {
    return problem(
      400,
      'invalid_unlock',
      'Story unlock payload is invalid',
      requestId,
    )
  }

  try {
    const result = await (
      dependencies.unlockSource ??
      ((input) => unlockStoryWithCredit(getDatabase().client, input))
    )({ operationKey, storyId, userId: authorization.userId })

    return Response.json(
      {
        balance: {
          availableCredits: result.availableCredits,
          version: result.walletVersion,
        },
        entitlementId: result.entitlementId,
        operationId: result.operationId,
        outcome: result.outcome,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return problem(
        409,
        'insufficient_credits',
        'A credit is required to unlock this Story',
        requestId,
      )
    }
    if (error instanceof StoryUnlockUnavailableError) {
      return problem(404, 'not_found', 'Story not found', requestId)
    }
    if (error instanceof UnlockOperationConflictError) {
      return problem(
        409,
        'idempotency_conflict',
        'Idempotency key conflicts with another unlock',
        requestId,
      )
    }
    throw error
  }
}
