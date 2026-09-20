import { describe, expect, it } from 'vitest'

import { evaluateReadiness, readinessResponse } from './health'

describe('health readiness', () => {
  it('reports ready only when every dependency succeeds', async () => {
    await expect(
      evaluateReadiness([
        { name: 'database', check: () => Promise.resolve() },
        { name: 'identity', check: () => Promise.resolve() },
      ]),
    ).resolves.toEqual({
      checks: [
        { name: 'database', status: 'ready' },
        { name: 'identity', status: 'ready' },
      ],
      status: 'ready',
    })
  })

  it('distinguishes a dependency failure without returning its details', async () => {
    const result = await evaluateReadiness([
      {
        name: 'database',
        check: () => Promise.reject(new Error('postgresql://secret@host/db')),
      },
      { name: 'identity', check: () => Promise.resolve() },
    ])
    const response = readinessResponse(result)

    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      checks: [
        { name: 'database', status: 'unavailable' },
        { name: 'identity', status: 'ready' },
      ],
      status: 'not_ready',
    })
  })
})
