import { can, type AuthorizationContext } from '@curiofold/domain'

import { IdentitySessionError, requireAuthorizationContext } from './identity'

type AuthorizationSource = () => Promise<AuthorizationContext>

function problem(
  status: number,
  code: string,
  title: string,
  headers: HeadersInit = {},
): Response {
  const responseHeaders = new Headers(headers)
  responseHeaders.set('Cache-Control', 'no-store')
  responseHeaders.set('Content-Type', 'application/problem+json')

  return Response.json(
    { type: 'about:blank', title, status, code },
    {
      status,
      headers: responseHeaders,
    },
  )
}

export async function createSessionResponse(
  source: AuthorizationSource = requireAuthorizationContext,
): Promise<Response> {
  try {
    const context = await source()
    return Response.json(
      {
        authenticated: true,
        emailVerified: context.emailVerified,
        permissions: {
          canCreateCheckout: can(context, 'checkout.create'),
          canReadOwnedStory: can(context, 'story.read-owned'),
          canUnlockStory: can(context, 'story.unlock'),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    if (!(error instanceof IdentitySessionError)) {
      throw error
    }

    if (error.code === 'identity_unavailable') {
      return problem(
        503,
        'identity_unavailable',
        'Identity service unavailable',
        { 'Retry-After': '60' },
      )
    }
    if (error.code === 'unauthenticated') {
      return problem(401, 'unauthenticated', 'Authentication required', {
        'WWW-Authenticate': 'Clerk',
      })
    }

    return problem(403, 'account_disabled', 'Account access disabled')
  }
}
