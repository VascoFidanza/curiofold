import { can, type AuthorizationContext } from '@curiofold/domain'
import {
  saveReadingProgress,
  type SaveReadingProgressInput,
  type SaveReadingProgressResult,
} from '@curiofold/db'

import { getDatabase } from './database'
import { IdentitySessionError, requireAuthorizationContext } from './identity'

type AuthorizationSource = () => Promise<AuthorizationContext>
type ProgressSource = (
  input: SaveReadingProgressInput,
) => Promise<SaveReadingProgressResult>

interface ReadingProgressPayload {
  readonly clientSequence: number
  readonly endMarkerReached: boolean
  readonly resumeBlockId: string
  readonly resumeOffset: number
  readonly versionId: string
}

interface ReadingProgressDependencies {
  readonly authorizationSource?: AuthorizationSource
  readonly progressSource?: ProgressSource
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const localePattern = /^[a-z]{2,3}(?:-[A-Z]{2})?$/u
const blockIdentifierPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const payloadKeys = [
  'clientSequence',
  'endMarkerReached',
  'resumeBlockId',
  'resumeOffset',
  'versionId',
] as const
const maximumPayloadBytes = 4_096
const maximumInteger = 2_147_483_647

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

function parsePayload(value: unknown): ReadingProgressPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const candidate = value as Record<string, unknown>
  const keys = Object.keys(candidate).sort()
  if (
    keys.length !== payloadKeys.length ||
    !payloadKeys.every((key, index) => key === keys[index])
  ) {
    return null
  }

  const clientSequence = candidate.clientSequence
  const endMarkerReached = candidate.endMarkerReached
  const resumeBlockId = candidate.resumeBlockId
  const resumeOffset = candidate.resumeOffset
  const versionId = candidate.versionId

  if (
    typeof clientSequence !== 'number' ||
    !Number.isInteger(clientSequence) ||
    clientSequence < 1 ||
    clientSequence > maximumInteger ||
    typeof endMarkerReached !== 'boolean' ||
    typeof resumeBlockId !== 'string' ||
    resumeBlockId.length > 120 ||
    !blockIdentifierPattern.test(resumeBlockId) ||
    typeof resumeOffset !== 'number' ||
    !Number.isInteger(resumeOffset) ||
    resumeOffset < 0 ||
    resumeOffset > maximumInteger ||
    typeof versionId !== 'string' ||
    !uuidPattern.test(versionId)
  ) {
    return null
  }

  return {
    clientSequence,
    endMarkerReached,
    resumeBlockId,
    resumeOffset,
    versionId,
  }
}

async function readPayload(
  request: Request,
): Promise<ReadingProgressPayload | null> {
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
    return parsePayload(JSON.parse(text) as unknown)
  } catch {
    return null
  }
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

export async function createReadingProgressResponse(
  request: Request,
  params: Readonly<{ locale: string; storyId: string }>,
  requestId: string,
  dependencies: ReadingProgressDependencies = {},
): Promise<Response> {
  if (!uuidPattern.test(params.storyId) || !localePattern.test(params.locale)) {
    return problem(404, 'not_found', 'Story not found', requestId)
  }
  if (!hasTrustedOrigin(request)) {
    return problem(
      403,
      'cross_origin',
      'Cross-origin request denied',
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

  if (!can(authorization, 'story.read-owned')) {
    return problem(403, 'forbidden', 'Access denied', requestId)
  }

  const payload = await readPayload(request)
  if (!payload) {
    return problem(
      400,
      'invalid_progress',
      'Reading progress payload is invalid',
      requestId,
    )
  }

  const result = await (
    dependencies.progressSource ??
    ((input) => saveReadingProgress(getDatabase().client, input))
  )({
    ...payload,
    locale: params.locale,
    storyId: params.storyId,
    userId: authorization.userId,
  })

  if (result.status !== 'found') {
    return problem(404, 'not_found', 'Story not found', requestId)
  }

  return Response.json(
    { accepted: result.accepted, progress: result.progress },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
