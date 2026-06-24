import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createSearchContacts } from '../../../src/resources/contacts/search'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const PAGE = {
  data: [
    {
      email: 'jane@example.com',
      firstName: 'Jane',
      subscribed: true,
      suppressed: false,
      createdAt: '2026-04-08T12:00:00.000Z',
      updatedAt: '2026-04-08T12:00:00.000Z',
      customFields: {},
    },
  ],
  pagination: { limit: 50, cursor: null, hasMore: false },
}

describe('contacts.search — the single contacts read', () => {
  it('POSTs /v1/contacts/search with count:false and returns the { data, pagination } page', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/contacts/search',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(PAGE)
        }
      )
    )

    const { client } = makeTestHttpClient()
    const search = createSearchContacts(client)

    const result = await search({
      filters: [{ field: 'subscribed', operator: 'equals', value: 'true' }],
    })

    expect(body).toEqual({
      filters: [{ field: 'subscribed', operator: 'equals', value: 'true' }],
      count: false,
    })
    expect(result.data[0]?.email).toBe('jane@example.com')
  })

  it('scopes the search to an audience via audienceId', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/contacts/search',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(PAGE)
        }
      )
    )

    const { client } = makeTestHttpClient()
    const search = createSearchContacts(client)

    await search({ audienceId: 'aud_123' })

    expect(body).toEqual({ audienceId: 'aud_123', count: false })
  })

  it('reads every contact when called with an empty body', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/contacts/search',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(PAGE)
        }
      )
    )

    const { client } = makeTestHttpClient()
    const search = createSearchContacts(client)

    const result = await search()

    expect(body).toEqual({ count: false })
    expect(result.data).toHaveLength(1)
  })
})
