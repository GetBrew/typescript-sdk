import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListContacts } from '../../../src/resources/contacts/list'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const CONTACT = (email: string) => ({
  email,
  subscribed: true,
  suppressed: false,
  createdAt: '2026-04-08T12:00:00.000Z',
  updatedAt: '2026-04-08T12:05:00.000Z',
  customFields: {},
})

describe('contacts.list', () => {
  it('sends GET /v1/contacts with limit and cursor and returns the { data, pagination } envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          data: [CONTACT('a@example.com'), CONTACT('b@example.com')],
          pagination: {
            limit: 100,
            cursor: 'cursor_abc',
            hasMore: true,
          },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListContacts(client)

    const result = await list({ limit: 100, cursor: 'start' })

    expect(capturedRequest?.method).toBe('GET')
    const url = new URL(capturedRequest!.url)
    expect(url.searchParams.get('limit')).toBe('100')
    expect(url.searchParams.get('cursor')).toBe('start')
    expect(result.data).toHaveLength(2)
    expect(result.pagination.cursor).toBe('cursor_abc')
    expect(result.pagination.hasMore).toBe(true)
  })

  it('is pagination-only — it does not serialize search/filter params', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          data: [],
          pagination: { limit: 50, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListContacts(client)

    await list({ limit: 50 })

    const url = new URL(capturedRequest!.url)
    expect(url.searchParams.get('limit')).toBe('50')
    // Filtering moved to POST /v1/contacts/search — list takes no filters.
    expect(url.searchParams.get('filter[subscribed]')).toBeNull()
    expect(url.searchParams.get('search')).toBeNull()
  })

  it('calls without any input when no options are passed', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          data: [],
          pagination: { limit: 50, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListContacts(client)

    await list()

    const url = new URL(capturedRequest!.url)
    expect(url.searchParams.get('limit')).toBeNull()
    expect(url.searchParams.get('cursor')).toBeNull()
  })
})
