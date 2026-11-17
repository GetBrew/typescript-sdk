import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createEventCounts } from '../../../src/resources/analytics/event-counts'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('analytics.eventCounts', () => {
  it('counts events per field and period on the events read, joining groupBy as CSV', async () => {
    let url: URL | undefined
    server.use(
      http.get('https://brew.new/api/v1/analytics/events', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({
          count: 42,
          groups: [
            {
              key: { eventType: 'clicked', link: 'https://example.com/a' },
              bucket: '2026-09-27T00:00:00.000Z',
              count: 30,
            },
          ],
          otherCount: 12,
          range: {
            from: '2026-09-21T00:00:00.000Z',
            to: '2026-09-28T00:00:00.000Z',
          },
          truncated: false,
        })
      })
    )
    const { client } = makeTestHttpClient()
    const eventCounts = createEventCounts(client)

    const counts = await eventCounts({
      groupBy: ['eventType', 'link'],
      bucket: 'day',
      eventType: 'clicked',
      sendId: 'snd_1',
    })

    expect(url?.pathname).toBe('/api/v1/analytics/events')
    expect(url?.searchParams.get('groupBy')).toBe('eventType,link')
    expect(url?.searchParams.get('bucket')).toBe('day')
    expect(url?.searchParams.get('eventType')).toBe('clicked')
    expect(url?.searchParams.get('sendId')).toBe('snd_1')
    // A grouped count refuses a cursor and ignores a page size.
    expect(url?.searchParams.get('cursor')).toBeNull()
    expect(url?.searchParams.get('limit')).toBeNull()
    expect(counts.count).toBe(42)
    expect(counts.otherCount).toBe(12)
  })

  it('keeps measured, zero and absent recipients in normal and raw replies', async () => {
    const body = {
      count: 11,
      groups: [
        {
          key: { eventType: 'opened' },
          bucket: '2026-10-01T00:00:00.000Z',
          count: 7,
          recipients: 2,
        },
        { key: { eventType: 'delivered' }, count: 1, recipients: 0 },
        { key: { eventType: 'sent' }, count: 3 },
      ],
      otherCount: 0,
      range: {
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-02T00:00:00.000Z',
      },
      truncated: false,
    }
    server.use(
      http.get('https://brew.new/api/v1/analytics/events', () =>
        HttpResponse.json(body, {
          headers: { 'x-request-id': 'req_event_counts' },
        })
      )
    )
    const { client } = makeTestHttpClient()
    const eventCounts = createEventCounts(client)

    const counts = await eventCounts({ groupBy: ['eventType'] })
    const raw = await eventCounts({ groupBy: ['eventType'] }, { raw: true })

    expect(counts).toEqual(body)
    expect(raw.data).toEqual(body)
    expect(raw.requestId).toBe('req_event_counts')
    // A measured zero stays zero; an unmeasured group stays without the key.
    expect(counts.groups[1]?.recipients).toBe(0)
    expect(counts.groups[2]).not.toHaveProperty('recipients')
  })

  it('counts per period alone, with no groupBy', async () => {
    let url: URL | undefined
    server.use(
      http.get('https://brew.new/api/v1/analytics/events', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({
          count: 3,
          groups: [],
          otherCount: 0,
          range: {
            from: '2026-09-21T00:00:00.000Z',
            to: '2026-09-28T00:00:00.000Z',
          },
          truncated: false,
        })
      })
    )
    const { client } = makeTestHttpClient()
    const eventCounts = createEventCounts(client)

    await eventCounts({ bucket: 'week' })

    expect(url?.searchParams.get('bucket')).toBe('week')
    expect(url?.searchParams.get('groupBy')).toBeNull()
  })
})
