import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createDomainsResource } from '../../../../src/resources/domains/resource'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

describe('domains.unsubscribes.remove', () => {
  it('DELETEs one address with both path segments URL-encoded', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.delete(
        'https://brew.new/api/v1/domains/:domainId/unsubscribes/:email',
        ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({
            domainId: 'dom/123',
            domainHost: 'send.example.com',
            email: 'o/brien+news@example.com',
            removed: true,
            globallyUnsubscribed: false,
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const domains = createDomainsResource(client)

    const result = await domains.unsubscribes.remove(
      'dom/123',
      'o/brien+news@example.com'
    )

    expect(capturedRequest?.method).toBe('DELETE')
    // A raw `/` or `+` in the address would split or corrupt the path.
    expect(new URL(capturedRequest!.url).pathname).toBe(
      '/api/v1/domains/dom%2F123/unsubscribes/o%2Fbrien%2Bnews%40example.com'
    )
    expect(result.removed).toBe(true)
    expect(result.globallyUnsubscribed).toBe(false)
  })

  it('returns the full BrewRawResponse when called with { raw: true }', async () => {
    server.use(
      http.delete(
        'https://brew.new/api/v1/domains/dom_123/unsubscribes/:email',
        () =>
          HttpResponse.json(
            {
              domainId: 'dom_123',
              domainHost: 'send.example.com',
              email: 'jane@example.com',
              removed: false,
              globallyUnsubscribed: true,
            },
            { headers: { 'x-request-id': 'req_raw_remove' } }
          )
      )
    )

    const { client } = makeTestHttpClient()
    const domains = createDomainsResource(client)

    const raw = await domains.unsubscribes.remove(
      'dom_123',
      'jane@example.com',
      { raw: true }
    )

    expect(raw.status).toBe(200)
    expect(raw.requestId).toBe('req_raw_remove')
    expect(raw.data.globallyUnsubscribed).toBe(true)
  })
})
