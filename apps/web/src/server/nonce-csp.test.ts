import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { nonceResponse } from './nonce-csp'

describe('nonce CSP fallback', () => {
  afterEach(() => vi.unstubAllEnvs())
  it('replaces untrusted headers and never shares nonces between requests', () => {
    const request = new NextRequest('https://curiofold.test/support', {
      headers: { 'x-nonce': 'attacker', 'Content-Security-Policy': 'attacker' },
    })
    const first = nonceResponse(request)
    const second = nonceResponse(request)
    const nonce = first.headers.get('x-middleware-request-x-nonce')
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/u)
    expect(second.headers.get('x-middleware-request-x-nonce')).not.toBe(nonce)
    expect(first.headers.get('Content-Security-Policy')).toContain(
      `'nonce-${nonce ?? ''}'`,
    )
    expect(
      first.headers.get('x-middleware-request-content-security-policy'),
    ).toBe(first.headers.get('Content-Security-Policy'))
    expect(first.headers.get('Cache-Control')).toContain('no-store')
    expect(first.headers.get('Content-Security-Policy')).not.toContain(
      'attacker',
    )
  })
  it.each(['production', 'development'] as const)(
    'limits eval to development (%s)',
    (mode) => {
      vi.stubEnv('NODE_ENV', mode)
      const policy = nonceResponse(
        new NextRequest('https://curiofold.test'),
      ).headers.get('Content-Security-Policy')
      expect(policy?.includes("'unsafe-eval'")).toBe(mode === 'development')
      expect(policy).toContain("'strict-dynamic'")
      expect(policy).toContain("form-action 'self'")
      expect(policy).not.toContain("'unsafe-inline'")
    },
  )
})
