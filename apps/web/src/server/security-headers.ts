/**
 * Headers that are safe to apply to every response before route-specific policy.
 *
 * The CSP deliberately establishes non-script guardrails only. A nonce-based
 * script policy will be added with the authenticated application shell so that
 * framework scripts and Clerk can be verified together instead of weakened by
 * a blanket `unsafe-inline` exception.
 */
export const securityHeaders: readonly {
  readonly key: string
  readonly value: string
}[] = [
  {
    key: 'Content-Security-Policy',
    value:
      "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), geolocation=(), microphone=()',
  },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
]

/** Paid Reader responses must never enter shared or browser HTTP caches. */
export const privateContentHeaders: readonly {
  readonly key: string
  readonly value: string
}[] = [
  {
    key: 'Cache-Control',
    value: 'private, no-store, max-age=0, must-revalidate',
  },
  { key: 'Pragma', value: 'no-cache' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
]
