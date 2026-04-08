import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createCountContacts } from '../../../src/resources/contacts/count'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.count', () => {
  it('sends GET /v1/contacts with count=true and returns the number unwrapped', async () => {
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
    expect(url.searchParams.get('count')).toBe('true')
    expect(result).toBe(42)
  })

  it('forwards filter as bracket-notation deep-object query when provided', async () => {
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
      filter: {
        'customFields.plan': { equals: 'enterprise' },
      },
    })

    const url = new URL(capturedRequest!.url)
    expect(url.searchParams.get('count')).toBe('true')
    expect(url.searchParams.get('filter[customFields.plan][equals]')).toBe(
      'enterprise'
    )
  })
})
