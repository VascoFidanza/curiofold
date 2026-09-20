import { describe, expect, it } from 'vitest'

import { securityHeaders } from './security-headers'

describe('security headers', () => {
  it('prevents framing, MIME sniffing and broad browser capabilities', () => {
    expect(
      Object.fromEntries(securityHeaders.map(({ key, value }) => [key, value])),
    ).toMatchInlineSnapshot(`
        {
          "Content-Security-Policy": "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
          "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        }
      `)
  })

  it('does not enable HSTS before the production domain is stable', () => {
    expect(
      securityHeaders.some(({ key }) => key === 'Strict-Transport-Security'),
    ).toBe(false)
  })
})
