import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListContacts } from '../../../src/resources/contacts/list'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.list', () => {
  it('sends GET /v1/contacts with limit and cursor and returns the pagination envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          contacts: [
            {
              email: 'a@example.com',
              subscribed: true,
              suppressed: false,
              createdAt: 1712592000000,
              updatedAt: 1712592300000,
              customFields: {},
            },
            {
              email: 'b@example.com',
              subscribed: true,
              suppressed: false,
              createdAt: 1712592000000,
              updatedAt: 1712592300000,
              customFields: {},
            },
          ],
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
    expect(result.contacts).toHaveLength(2)
    expect(result.pagination.cursor).toBe('cursor_abc')
    expect(result.pagination.hasMore).toBe(true)
  })

  it('serializes filter as deepObject bracket-notation query keys', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          contacts: [],
          pagination: { limit: 50, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListContacts(client)

    await list({
      filter: {
        _logic: 'and',
        subscribed: 'true',
        'customFields.plan': { equals: 'enterprise' },
      },
    })

    const url = new URL(capturedRequest!.url)
    expect(url.searchParams.get('filter[_logic]')).toBe('and')
    expect(url.searchParams.get('filter[subscribed]')).toBe('true')
    expect(url.searchParams.get('filter[customFields.plan][equals]')).toBe(
      'enterprise'
    )
  })

  it('calls without any input when no options are passed', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          contacts: [],
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
    expect(url.searchParams.get('filter[subscribed]')).toBeNull()
  })
})
