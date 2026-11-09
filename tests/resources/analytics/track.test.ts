import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createAnalyticsResource } from '../../../src/resources/analytics/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const event = {
  schemaVersion: 1 as const,
  id: 'event-order-123',
  type: 'track' as const,
  name: 'order_completed',
  occurredAt: '2026-10-28T12:00:00.000Z',
  anonymousId: 'anonymous-123',
  userId: 'user-123',
  sessionId: 'session-123',
  tabId: 'server',
  pageViewId: 'server',
  properties: { orderId: 'order-123', amount: 4200 },
  context: {},
  sdk: { name: 'orders-service', version: '1.0.0' },
}

describe('analytics.track', () => {
  it('preserves event IDs and the caller idempotency key across retries', async () => {
    const bodies: Array<unknown> = []
    const keys: Array<string | null> = []
    server.use(
      http.post(
        'https://brew.new/api/v1/analytics/track',
        async ({ request }) => {
          bodies.push(await request.json())
          keys.push(request.headers.get('idempotency-key'))
          if (bodies.length === 1)
            return new HttpResponse(null, { status: 503 })
          return HttpResponse.json(
            { accepted: [event.id], rejected: [] },
            { status: 202 }
          )
        }
      )
    )
    const { client } = makeTestHttpClient()
    const result = await createAnalyticsResource(client).track(
      { projectId: 'project-123', events: [event] },
      { idempotencyKey: 'order-123' }
    )
    expect(bodies).toEqual([
      { projectId: 'project-123', events: [event] },
      { projectId: 'project-123', events: [event] },
    ])
    expect(keys).toEqual(['order-123', 'order-123'])
    expect(result).toEqual({ accepted: [event.id], rejected: [] })
  })

  it('supports raw responses and preserves per-event rejection details', async () => {
    server.use(
      http.post('https://brew.new/api/v1/analytics/track', () =>
        HttpResponse.json(
          {
            accepted: [],
            rejected: [{ id: event.id, reason: 'invalid_event' }],
          },
          { status: 202 }
        )
      )
    )
    const { client } = makeTestHttpClient()
    const result = await createAnalyticsResource(client).track(
      { projectId: 'project-123', events: [event] },
      { raw: true }
    )
    expect(result.status).toBe(202)
    expect(result.data.rejected).toEqual([
      { id: event.id, reason: 'invalid_event' },
    ])
  })
})
