import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  createEventsAnalytics,
  createEventsAnalyticsAll,
} from '../../../src/resources/analytics/events'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('analytics.events', () => {
  it('GETs /v1/analytics/events with recipient filter and returns { events, pagination, range }', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/analytics/events', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          events: [
            {
              id: 'evt_1',
              occurredAt: '2026-04-08T12:34:56.789Z',
              domain: 'email',
              eventType: 'opened',
              recipientEmail: 'jane@example.com',
              emailId: 'eml_launch',
            },
          ],
          pagination: { limit: 50, cursor: null, hasMore: false },
          range: {
            from: '2026-04-01T00:00:00.000Z',
            to: '2026-04-08T00:00:00.000Z',
          },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const events = createEventsAnalytics(client)

    const result = await events({ recipientEmail: 'jane@example.com' })

    expect(new URL(url!).searchParams.get('recipientEmail')).toBe(
      'jane@example.com'
    )
    expect(result.events[0]?.eventType).toBe('opened')
    expect(result.range.from).toBe('2026-04-01T00:00:00.000Z')
  })
})

describe('analytics.eventsAll', () => {
  it('pages the whole feed for one recipient', async () => {
    server.use(
      http.get('https://brew.new/api/v1/analytics/events', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor')
        if (cursor === null) {
          return HttpResponse.json({
            events: [
              {
                id: 'evt_1',
                occurredAt: '2026-04-08T12:00:00.000Z',
                domain: 'email',
                eventType: 'delivered',
              },
            ],
            pagination: { limit: 1, cursor: 'p2', hasMore: true },
            range: { from: 'x', to: 'y' },
          })
        }
        return HttpResponse.json({
          events: [
            {
              id: 'evt_2',
              occurredAt: '2026-04-08T13:00:00.000Z',
              domain: 'email',
              eventType: 'opened',
            },
          ],
          pagination: { limit: 1, cursor: null, hasMore: false },
          range: { from: 'x', to: 'y' },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const eventsAll = createEventsAnalyticsAll(client)

    const ids: Array<string> = []
    for await (const row of eventsAll({ recipientEmail: 'jane@example.com' })) {
      ids.push(row.id)
    }

    expect(ids).toEqual(['evt_1', 'evt_2'])
  })
})
