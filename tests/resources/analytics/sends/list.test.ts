import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListSends } from '../../../../src/resources/analytics/sends/list'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

describe('analytics.sends.list', () => {
  it('GETs /v1/analytics/sends with filters and returns { data, pagination }', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/analytics/sends', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          data: [
            {
              sendId: 'snd_promo',
              kind: 'campaign',
              emailId: 'eml_promo',
              status: 'sent',
              audienceId: 'aud_1',
              createdAt: '2026-04-08T12:00:00.000Z',
              updatedAt: '2026-04-08T12:34:56.000Z',
              stats: {
                sent: 100,
                delivered: 98,
                opened: 40,
                clicked: 8,
                bounced: 2,
                complained: 0,
                unsubscribed: 1,
              },
            },
          ],
          pagination: { limit: 50, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListSends(client)

    const result = await list({ status: 'sent', limit: 50 })

    const params = new URL(url!).searchParams
    expect(new URL(url!).pathname).toBe('/api/v1/analytics/sends')
    expect(params.get('status')).toBe('sent')
    expect(params.get('limit')).toBe('50')
    expect(result.data[0]?.emailId).toBe('eml_promo')
    expect(result.data[0]?.stats?.delivered).toBe(98)
    expect(result.pagination?.hasMore).toBe(false)
  })

  it('detail mode: sendId + include events returns the single-row page with events[] inlined', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/analytics/sends', ({ request }) => {
        url = request.url
        // Reads are flat: identity in the query; detail = `{ data: [row] }`.
        return HttpResponse.json({
          data: [
            {
              sendId: 'snd_promo',
              kind: 'campaign',
              emailId: 'eml_promo',
              status: 'sent',
              createdAt: '2026-04-08T12:00:00.000Z',
              updatedAt: '2026-04-08T12:34:56.000Z',
              events: [
                {
                  eventType: 'opened',
                  occurredAt: '2026-04-08T12:35:00.000Z',
                  recipientEmail: 'reader@example.com',
                },
              ],
            },
          ],
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListSends(client)

    const result = await list({ sendId: 'snd_promo', include: 'events' })

    const params = new URL(url!).searchParams
    expect(params.get('sendId')).toBe('snd_promo')
    expect(params.get('include')).toBe('events')
    expect(result.data[0]?.events).toHaveLength(1)
    expect(result.data[0]?.events?.[0]?.eventType).toBe('opened')
    expect(result.pagination).toBeUndefined()
  })
})
