import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createCountContacts } from '../../../src/resources/contacts/count'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.count', () => {
  it('POSTs /v1/contacts/search with count:true and returns the number unwrapped', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/contacts/search',
        async ({ request }) => {
          capturedRequest = request.clone()
          capturedBody = await request.json()
          return HttpResponse.json({ count: 42 })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const count = createCountContacts(client)

    const result = await count()

    expect(capturedRequest?.method).toBe('POST')
    expect(new URL(capturedRequest!.url).pathname).toBe(
      '/api/v1/contacts/search'
    )
    expect(capturedBody).toEqual({ count: true })
    expect(result).toBe(42)
  })

  it('forwards a filters array in the search body when provided', async () => {
    let capturedBody: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/contacts/search',
        async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ count: 5 })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const count = createCountContacts(client)

    await count({
      filters: [
        {
          field: 'customFields.plan',
          operator: 'equals',
          value: 'enterprise',
        },
      ],
      logic: 'and',
    })

    expect(capturedBody).toEqual({
      filters: [
        {
          field: 'customFields.plan',
          operator: 'equals',
          value: 'enterprise',
        },
      ],
      logic: 'and',
      count: true,
    })
  })
})
