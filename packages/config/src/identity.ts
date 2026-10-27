/** Checks declared environment/key mode, not key validity or same-instance pairing. */
export function identityKeysMatchEnvironment(
  source: Readonly<Record<string, string | undefined>>,
): boolean {
  const environment = source.NEXT_PUBLIC_ENVIRONMENT ?? 'local'
  if (
    !['local', 'test', 'preview', 'staging', 'production'].includes(environment)
  )
    return false
  const production = environment === 'production'
  if (source.VERCEL_ENV === 'production' && !production) return false
  if (source.VERCEL_ENV && source.VERCEL_ENV !== 'production' && production)
    return false

  const mode = production ? 'live' : 'test'
  const matches = (value: string | undefined, prefix: string) =>
    Boolean(
      value &&
      value.startsWith(prefix) &&
      value.length > prefix.length &&
      !/\s/u.test(value),
    )
  return (
    matches(source.CLERK_SECRET_KEY, `sk_${mode}_`) &&
    matches(source.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, `pk_${mode}_`)
  )
}
