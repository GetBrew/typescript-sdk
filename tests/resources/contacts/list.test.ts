import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListContacts } from '../../../src/resources/contacts/list'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.list', () => {
  it('sends GET /v1/contacts with limit and cursor, returns the pagination envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          contacts: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
          nextCursor: 'cursor_abc',
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
    expect(result.nextCursor).toBe('cursor_abc')
  })

  it('serializes filters as a JSON query param', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ contacts: [] })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListContacts(client)

    await list({
      filters: [
        { field: 'customFields.plan', operator: 'eq', value: 'enterprise' },
      ],
    })

    const url = new URL(capturedRequest!.url)
    const rawFilters = url.searchParams.get('filters')
    expect(rawFilters).not.toBeNull()
    expect(JSON.parse(rawFilters!)).toEqual([
      { field: 'customFields.plan', operator: 'eq', value: 'enterprise' },
    ])
  })

  it('calls without any input when no options are passed', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ contacts: [] })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListContacts(client)

    await list()

    const url = new URL(capturedRequest!.url)
    expect(url.searchParams.get('limit')).toBeNull()
    expect(url.searchParams.get('cursor')).toBeNull()
    expect(url.searchParams.get('filters')).toBeNull()
  })
})
