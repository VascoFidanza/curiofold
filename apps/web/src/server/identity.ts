import { auth } from '@clerk/nextjs/server'
import type { AuthorizationContext } from '@curiofold/domain'
import { ensureIdentityAccount } from '@curiofold/db'

import { getDatabase } from './database'

interface ProviderSessionSnapshot {
  readonly factorVerificationAge: readonly [number, number] | null
  readonly sessionId: string | null
  readonly userId: string | null
}

interface IdentityDependencies {
  authSource?: () => Promise<ProviderSessionSnapshot>
  clock?: () => Date
  database?: ReturnType<typeof getDatabase>['client']
}

export type IdentitySessionErrorCode =
  'account_disabled' | 'identity_unavailable' | 'unauthenticated'

export class IdentitySessionError extends Error {
  readonly code: IdentitySessionErrorCode

  constructor(code: IdentitySessionErrorCode) {
    super(code)
    this.name = 'IdentitySessionError'
    this.code = code
  }
}

export function isClerkSessionConfigured(
  source: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(
    source.CLERK_SECRET_KEY && source.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  )
}

function verificationTime(now: Date, ageMinutes: number): Date | null {
  if (!Number.isFinite(ageMinutes) || ageMinutes < 0) {
    return null
  }

  return new Date(now.getTime() - ageMinutes * 60_000)
}

async function readClerkSession(): Promise<ProviderSessionSnapshot> {
  const result = await auth()
  return {
    factorVerificationAge: result.factorVerificationAge,
    sessionId: result.sessionId,
    userId: result.userId,
  }
}

export async function requireAuthorizationContext(
  dependencies: IdentityDependencies = {},
): Promise<AuthorizationContext> {
  if (!dependencies.authSource && !isClerkSessionConfigured()) {
    throw new IdentitySessionError('identity_unavailable')
  }

  const now = (dependencies.clock ?? (() => new Date()))()
  const session = await (dependencies.authSource ?? readClerkSession)()
  if (!session.userId || !session.sessionId) {
    throw new IdentitySessionError('unauthenticated')
  }

  const account = await ensureIdentityAccount(
    dependencies.database ?? getDatabase().client,
    session.userId,
    now,
  )
  if (account.accountState !== 'active') {
    throw new IdentitySessionError('account_disabled')
  }

  const [firstFactorAge, secondFactorAge] = session.factorVerificationAge ?? [
    -1, -1,
  ]

  return {
    accountState: account.accountState,
    emailVerified: account.emailVerified,
    firstFactorVerifiedAt: verificationTime(now, firstFactorAge),
    secondFactorVerifiedAt: verificationTime(now, secondFactorAge),
    staffRoles: account.staffRoles,
    userId: account.userId,
  }
}
