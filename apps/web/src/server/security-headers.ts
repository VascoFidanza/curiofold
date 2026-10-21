/**
 * Headers that are safe to apply to every response before route-specific policy.
 *
 * Static assets retain this non-script baseline. Document requests receive the
 * request-specific nonce script policy from proxy.ts (Clerk's strict CSP when
 * identity is configured), and the dynamic shell forwards that nonce to Clerk.
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

/** Synthetic and test content must not be indexed before a production release. */
export function publicIndexingHeaders(vercelEnvironment?: string) {
  return vercelEnvironment === 'production'
    ? []
    : [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }]
}
