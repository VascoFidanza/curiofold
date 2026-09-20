import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { createClerkWebhookResponse } from './clerk-webhook'

function request(): NextRequest {
  return new NextRequest('https://curiofold.test/api/webhooks/clerk', {
    headers: {
      'svix-id': 'evt_identity_fixture',
      'svix-timestamp': '1789905600',
    },
    method: 'POST',
  })
}

const createdEvent = {
  data: {
    email_addresses: [
      {
        id: 'email_fixture',
        verification: { status: 'verified' },
      },
    ],
    id: 'user_clerk_fixture',
    primary_email_address_id: 'email_fixture',
    updated_at: 1_789_905_600_000,
  },
  object: 'event',
  type: 'user.created',
}

describe('Clerk lifecycle webhook boundary', () => {
  it('fails closed when the endpoint has no signing configuration', async () => {
    const response = await createClerkWebhookResponse(request(), {
      configured: false,
    })

    expect(response.status).toBe(503)
  })

  it('rejects an event that fails signature verification', async () => {
    const response = await createClerkWebhookResponse(request(), {
      configured: true,
      verify: () => Promise.reject(new Error('bad signature')),
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'invalid_webhook_signature',
    })
  })

  it('projects only the minimum verified lifecycle state', async () => {
    const apply = vi.fn().mockResolvedValue('applied')
    const response = await createClerkWebhookResponse(request(), {
      apply,
      configured: true,
      verify: () => Promise.resolve(createdEvent as never),
    })

    expect(response.status).toBe(200)
    expect(apply).toHaveBeenCalledWith({
      emailVerified: true,
      eventId: 'evt_identity_fixture',
      occurredAt: new Date('2026-09-20T12:00:00.000Z'),
      subject: 'user_clerk_fixture',
      type: 'user.created',
    })
  })

  it('rejects a verified user event without its Svix delivery metadata', async () => {
    const response = await createClerkWebhookResponse(
      new NextRequest('https://curiofold.test/api/webhooks/clerk', {
        headers: { 'svix-timestamp': '1789905600' },
        method: 'POST',
      }),
      {
        configured: true,
        verify: () => Promise.resolve(createdEvent as never),
      },
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'invalid_webhook_metadata',
    })
  })

  it('ignores verified non-user events without persisting their payload', async () => {
    const apply = vi.fn()
    const response = await createClerkWebhookResponse(request(), {
      apply,
      configured: true,
      verify: () =>
        Promise.resolve({
          data: { id: 'session_fixture' },
          object: 'event',
          type: 'session.created',
        } as never),
    })

    expect(response.status).toBe(204)
    expect(apply).not.toHaveBeenCalled()
  })
})
