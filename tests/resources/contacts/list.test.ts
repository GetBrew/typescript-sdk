import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListContacts } from '../../../src/resources/contacts/list'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.list', () => {
  it('GETs /v1/contacts with the simple read filters and returns { data, pagination }', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          data: [
            {
              email: 'jane@example.com',
              createdAt: '2026-04-08T12:00:00.000Z',
              updatedAt: '2026-04-08T12:00:00.000Z',
            },
          ],
          pagination: { limit: 50, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const result = await createListContacts(client)({
      search: 'jane',
      audienceId: 'aud_1',
      sort: 'createdAt',
      order: 'desc',
      limit: 50,
    })

    const params = new URL(url!).searchParams
    expect(new URL(url!).pathname).toBe('/api/v1/contacts')
    expect(params.get('search')).toBe('jane')
    expect(params.get('audienceId')).toBe('aud_1')
    expect(params.get('sort')).toBe('createdAt')
    expect(params.get('order')).toBe('desc')
    expect(params.get('limit')).toBe('50')
    expect(result.data[0]?.email).toBe('jane@example.com')
    expect(result.pagination.hasMore).toBe(false)
  })
})
