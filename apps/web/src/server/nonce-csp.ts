import { NextResponse, type NextRequest } from 'next/server'

/** Local/no-identity fallback; configured identity uses Clerk's strict CSP builder. */
export function nonceResponse(request: NextRequest): NextResponse {
  const nonce = Buffer.from(
    crypto.getRandomValues(new Uint8Array(16)),
  ).toString('base64')
  const policy = `base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}; script-src-attr 'none'`
  const headers = new Headers(request.headers)
  // Never trust caller-supplied nonce or CSP headers.
  headers.set('x-nonce', nonce)
  headers.set('Content-Security-Policy', policy)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('Content-Security-Policy', policy)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
