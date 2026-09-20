import { verifyWebhook, type WebhookEvent } from '@clerk/nextjs/webhooks'
import {
  applyIdentityLifecycleEvent,
  type IdentityLifecycleEvent,
  type IdentityLifecycleResult,
} from '@curiofold/db'
import type { NextRequest } from 'next/server'

import { getDatabase } from './database'

interface ClerkWebhookDependencies {
  apply?: (event: IdentityLifecycleEvent) => Promise<IdentityLifecycleResult>
  configured?: boolean
  verify?: (request: NextRequest) => Promise<WebhookEvent>
}

export function isClerkWebhookConfigured(
  source: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(source.CLERK_WEBHOOK_SIGNING_SECRET && source.DATABASE_URL)
}

function problem(status: number, code: string, title: string): Response {
  return Response.json(
    { type: 'about:blank', title, status, code },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/problem+json',
      },
    },
  )
}

function headerOccurredAt(request: NextRequest): Date | null {
  const timestamp = Number(request.headers.get('svix-timestamp'))
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) {
    return null
  }

  return new Date(timestamp * 1_000)
}

function primaryEmailIsVerified(
  event: Extract<WebhookEvent, { type: 'user.created' | 'user.updated' }>,
): boolean {
  const primary = event.data.email_addresses.find(
    ({ id }) => id === event.data.primary_email_address_id,
  )
  return primary?.verification?.status === 'verified'
}

function lifecycleEvent(
  request: NextRequest,
  event: WebhookEvent,
): IdentityLifecycleEvent | null {
  if (
    event.type !== 'user.created' &&
    event.type !== 'user.updated' &&
    event.type !== 'user.deleted'
  ) {
    return null
  }

  const eventId = request.headers.get('svix-id')
  const subject = event.data.id
  const fallbackOccurredAt = headerOccurredAt(request)
  if (!eventId || !subject || !fallbackOccurredAt) {
    throw new TypeError('Verified identity event metadata is incomplete.')
  }

  if (event.type === 'user.deleted') {
    return {
      emailVerified: false,
      eventId,
      occurredAt: fallbackOccurredAt,
      subject,
      type: event.type,
    }
  }

  const providerOccurredAt = new Date(event.data.updated_at)
  if (Number.isNaN(providerOccurredAt.getTime())) {
    throw new TypeError('Verified identity event timestamp is invalid.')
  }

  return {
    emailVerified: primaryEmailIsVerified(event),
    eventId,
    occurredAt: providerOccurredAt,
    subject,
    type: event.type,
  }
}

export async function createClerkWebhookResponse(
  request: NextRequest,
  dependencies: ClerkWebhookDependencies = {},
): Promise<Response> {
  const configured =
    dependencies.configured ?? isClerkWebhookConfigured(process.env)
  if (!configured) {
    return problem(
      503,
      'identity_webhook_unavailable',
      'Identity webhook unavailable',
    )
  }

  let verified: WebhookEvent
  try {
    verified = await (dependencies.verify ?? verifyWebhook)(request)
  } catch {
    return problem(400, 'invalid_webhook_signature', 'Invalid webhook')
  }

  let projected: IdentityLifecycleEvent | null
  try {
    projected = lifecycleEvent(request, verified)
  } catch {
    return problem(400, 'invalid_webhook_metadata', 'Invalid webhook')
  }

  if (!projected) {
    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const apply =
    dependencies.apply ??
    ((event: IdentityLifecycleEvent) =>
      applyIdentityLifecycleEvent(getDatabase().client, event))
  const result = await apply(projected)
  return Response.json(
    { received: true, result },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
