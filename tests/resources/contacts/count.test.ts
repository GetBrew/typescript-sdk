import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createCountContacts } from '../../../src/resources/contacts/count'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.count', () => {
  it('sends GET /v1/contacts with action=count and returns the number unwrapped', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ count: 42 })
      })
    )

    const { client } = makeTestHttpClient()
    const count = createCountContacts(client)

    const result = await count()

    const url = new URL(capturedRequest!.url)
    expect(url.searchParams.get('action')).toBe('count')
    expect(result).toBe(42)
  })

  it('forwards filters as JSON when provided', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ count: 5 })
      })
    )

    const { client } = makeTestHttpClient()
    const count = createCountContacts(client)

    await count({
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
})
