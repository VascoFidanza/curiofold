import { describe, expect, it } from 'vitest'

import {
  createStructuredLogger,
  observeRoute,
  resolveRequestId,
  sanitizeLogContext,
} from './observability'

describe('structured observability', () => {
  it('emits stable JSON with only explicitly safe context', () => {
    const lines: string[] = []
    const logger = createStructuredLogger({
      clock: () => new Date('2026-09-20T00:00:00.000Z'),
      environment: 'test',
      release: 'abc123',
      sink: (_level, line) => lines.push(line),
    })

    logger.info('story.requested', {
      requestId: 'request-1234',
      route: '/stories/[slug]',
      storyId: 'story-1234',
      // The cast simulates an unsafe JavaScript/provider object crossing the
      // TypeScript boundary. Runtime filtering must still remove it.
      token: 'secret-token',
      email: 'reader@example.com',
      storyBody: 'paid Story content',
      paymentCard: '4242 4242 4242 4242',
      outcome: 'reader@example.com',
    } as never)

    expect(JSON.parse(lines[0] ?? '{}')).toEqual({
      timestamp: '2026-09-20T00:00:00.000Z',
      level: 'info',
      event: 'story.requested',
      service: 'curiofold-web',
      environment: 'test',
      release: 'abc123',
      requestId: 'request-1234',
      route: '/stories/[slug]',
      storyId: 'story-1234',
    })
    expect(lines[0]).not.toContain('secret-token')
    expect(lines[0]).not.toContain('reader@example.com')
    expect(lines[0]).not.toContain('paid Story content')
    expect(lines[0]).not.toContain('4242')
    expect(lines[0]).not.toContain('outcome')
  })

  it('drops nested and unknown values at runtime', () => {
    expect(
      sanitizeLogContext({
        requestId: 'request-1234',
        providerPayload: { email: 'reader@example.com' },
        token: 'secret',
      }),
    ).toEqual({ requestId: 'request-1234' })
  })

  it('honours the configured minimum log level', () => {
    const lines: string[] = []
    const logger = createStructuredLogger({
      minimumLevel: 'warn',
      sink: (_level, line) => lines.push(line),
    })

    logger.info('http.request.started')
    logger.warn('health.dependency.unavailable')

    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('health.dependency.unavailable')
  })

  it('uses a valid upstream request id and replaces malformed input', () => {
    expect(
      resolveRequestId(
        new Request('https://example.test', {
          headers: { 'x-request-id': 'request-1234' },
        }),
      ),
    ).toBe('request-1234')

    expect(
      resolveRequestId(
        new Request('https://example.test', {
          headers: { 'x-request-id': 'reader@example.com' },
        }),
        () => 'generated-request-id',
      ),
    ).toBe('generated-request-id')
  })

  it('returns a traceable problem response without leaking failure details', async () => {
    const lines: string[] = []
    const logger = createStructuredLogger({
      sink: (_level, line) => lines.push(line),
    })
    const times = [10, 25]
    const response = await observeRoute(
      new Request('https://example.test/health/failure'),
      '/health/failure',
      () => {
        throw new Error('token=secret-token reader@example.com')
      },
      {
        idFactory: () => 'generated-request-id',
        logger,
        now: () => times.shift() ?? 25,
      },
    )

    expect(response.status).toBe(500)
    expect(response.headers.get('content-type')).toBe(
      'application/problem+json',
    )
    expect(response.headers.get('x-request-id')).toBe('generated-request-id')
    await expect(response.json()).resolves.toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      code: 'internal_error',
      requestId: 'generated-request-id',
    })
    expect(lines.join('\n')).toContain('http.request.failed')
    expect(lines.join('\n')).toContain('generated-request-id')
    expect(lines.join('\n')).not.toContain('secret-token')
    expect(lines.join('\n')).not.toContain('reader@example.com')
  })
})
