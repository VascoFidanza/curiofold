import { can, type AuthorizationContext } from '@curiofold/domain'

import { IdentitySessionError, requireAuthorizationContext } from './identity'
import { getReaderStoryRoute, type ReaderStoryRouteData } from './reader-story'

type AuthorizationSource = () => Promise<AuthorizationContext>
type StorySource = (
  userId: string,
  locale: string,
  slug: string,
) => Promise<ReaderStoryRouteData>

export type ReaderAccessResult =
  | ReaderStoryRouteData
  | Readonly<{ status: 'account_disabled' }>
  | Readonly<{ status: 'forbidden' }>
  | Readonly<{ status: 'identity_unavailable' }>
  | Readonly<{ status: 'unauthenticated' }>

export async function resolveReaderAccess(
  locale: string,
  slug: string,
  dependencies: Readonly<{
    authorizationSource?: AuthorizationSource
    storySource?: StorySource
  }> = {},
): Promise<ReaderAccessResult> {
  let authorization: AuthorizationContext
  try {
    authorization = await (
      dependencies.authorizationSource ?? requireAuthorizationContext
    )()
  } catch (error) {
    if (error instanceof IdentitySessionError) {
      return { status: error.code }
    }

    throw error
  }

  if (!can(authorization, 'story.read-owned')) {
    return { status: 'forbidden' }
  }

  return (dependencies.storySource ?? getReaderStoryRoute)(
    authorization.userId,
    locale,
    slug,
  )
}
