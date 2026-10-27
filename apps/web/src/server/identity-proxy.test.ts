import { NextRequest, NextResponse } from 'next/server'
import { afterEach, expect, it, vi } from 'vitest'

const middleware = vi.hoisted(() => vi.fn(() => () => NextResponse.next()))
vi.mock('@clerk/nextjs/server', () => ({ clerkMiddleware: middleware }))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  middleware.mockClear()
})

it('keeps strict nonce protection without mounting development Clerk in production', async () => {
  vi.stubEnv('VERCEL_ENV', 'production')
  vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'preview')
  vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fixture')
  vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_fixture')
  const { default: proxy } = await import('../proxy')
  const response = await proxy(
    new NextRequest('https://curiofold.test/account'),
    {} as never,
  )
  expect(middleware).not.toHaveBeenCalled()
  expect(response?.headers.get('Content-Security-Policy')).toContain(
    "'strict-dynamic'",
  )
  expect(response?.headers.get('Cache-Control')).toContain('no-store')
  expect(response?.headers.get('x-middleware-request-x-nonce')).toBeTruthy()
})

it('preserves the existing development Clerk integration and authorized origin', async () => {
  vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', 'preview')
  vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fixture')
  vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_fixture')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://curiofold.test')
  await import('../proxy')
  expect(middleware).toHaveBeenCalledWith(
    expect.any(Function),
    expect.objectContaining({
      authorizedParties: ['https://curiofold.test'],
      contentSecurityPolicy: expect.objectContaining({ strict: true }),
    }),
  )
})
