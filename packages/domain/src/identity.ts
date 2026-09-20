export const staffRoles = [
  'editor',
  'publisher',
  'support',
  'finance',
  'admin',
] as const

export type StaffRole = (typeof staffRoles)[number]
export type AccountState = 'active' | 'disabled' | 'pending_deletion'

export type Capability =
  | 'account.read'
  | 'checkout.create'
  | 'payment.refund'
  | 'role.manage'
  | 'story.edit'
  | 'story.publish'
  | 'story.read-owned'
  | 'story.unlock'
  | 'support.account-manage'
  | 'wallet.adjust'

export interface AuthorizationContext {
  readonly accountState: AccountState
  readonly emailVerified: boolean
  readonly firstFactorVerifiedAt: Date | null
  readonly secondFactorVerifiedAt: Date | null
  readonly staffRoles: ReadonlySet<StaffRole>
  readonly userId: string
}

const consumerCapabilities = new Set<Capability>([
  'account.read',
  'story.read-owned',
])

const verifiedEmailCapabilities = new Set<Capability>([
  'checkout.create',
  'story.unlock',
])

const staffCapabilities: Readonly<Record<StaffRole, ReadonlySet<Capability>>> =
  {
    admin: new Set([
      'payment.refund',
      'role.manage',
      'story.edit',
      'story.publish',
      'support.account-manage',
      'wallet.adjust',
    ]),
    editor: new Set(['story.edit']),
    finance: new Set(['payment.refund', 'wallet.adjust']),
    publisher: new Set(['story.edit', 'story.publish']),
    support: new Set(['support.account-manage']),
  }

const recentVerificationWindowMs = 15 * 60 * 1_000

function isRecent(
  verifiedAt: Date | null,
  now: Date,
  maximumAgeMs = recentVerificationWindowMs,
): boolean {
  if (!verifiedAt) {
    return false
  }

  const age = now.getTime() - verifiedAt.getTime()
  return age >= -5_000 && age <= maximumAgeMs
}

function hasRecentStaffAssurance(
  context: AuthorizationContext,
  now: Date,
): boolean {
  return (
    context.emailVerified &&
    isRecent(context.firstFactorVerifiedAt, now) &&
    isRecent(context.secondFactorVerifiedAt, now)
  )
}

export function can(
  context: AuthorizationContext,
  capability: Capability,
  now = new Date(),
): boolean {
  if (context.accountState !== 'active') {
    return false
  }

  if (consumerCapabilities.has(capability)) {
    return true
  }

  if (verifiedEmailCapabilities.has(capability)) {
    return context.emailVerified
  }

  if (!hasRecentStaffAssurance(context, now)) {
    return false
  }

  return Array.from(context.staffRoles).some((role) =>
    staffCapabilities[role].has(capability),
  )
}

const exactReturnPaths = new Set([
  '/',
  '/account',
  '/collections',
  '/library',
  '/progress',
  '/search',
])

const localizedStoryPath =
  /^\/[a-z]{2}(?:-[A-Z]{2})?\/stories\/[a-z0-9]+(?:-[a-z0-9]+)*$/u

export function safeReturnPath(
  candidate: string | null | undefined,
  fallback = '/',
): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback
  }

  try {
    const base = new URL('https://curiofold.invalid')
    const resolved = new URL(candidate, base)

    if (
      resolved.origin !== base.origin ||
      resolved.username ||
      resolved.password ||
      resolved.pathname.includes('\\')
    ) {
      return fallback
    }

    if (
      !exactReturnPaths.has(resolved.pathname) &&
      !localizedStoryPath.test(resolved.pathname)
    ) {
      return fallback
    }

    return `${resolved.pathname}${resolved.search}`
  } catch {
    return fallback
  }
}
