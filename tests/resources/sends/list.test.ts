import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListSends } from '../../../src/resources/sends/list'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('sends.list', () => {
  it('GETs /v1/sends with filters and returns { sends, pagination }', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/sends', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          sends: [
            {
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
    expect(params.get('status')).toBe('sent')
    expect(params.get('limit')).toBe('50')
    expect(result.sends[0]?.emailId).toBe('eml_promo')
    expect(result.sends[0]?.stats?.delivered).toBe(98)
    expect(result.pagination?.hasMore).toBe(false)
  })
})
