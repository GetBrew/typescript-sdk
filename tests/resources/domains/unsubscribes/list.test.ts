import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createDomainsResource } from '../../../../src/resources/domains/resource'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

const PAGE = {
  domainId: 'dom/123',
  domainHost: 'send.example.com',
  data: [
    {
      email: 'jane@example.com',
      scope: 'domain',
      unsubscribedAt: '2026-09-17T09:12:00.000Z',
      source: 'link',
      sendId: 'send_123',
    },
  ],
  pagination: { limit: 50, cursor: 'next_page', hasMore: true },
}

describe('domains.unsubscribes.list', () => {
  it('sends GET /v1/domains/{domainId}/unsubscribes with every query knob', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/domains/dom%2F123/unsubscribes',
        ({ request }) => {
          capturedRequest = request
          return HttpResponse.json(PAGE)
        }
      )
    )

    const { client } = makeTestHttpClient()
    const domains = createDomainsResource(client)

    const result = await domains.unsubscribes.list({
      domainId: 'dom/123',
      q: 'jane@',
      scope: 'domain',
      limit: 50,
      cursor: 'page_1',
    })

    expect(capturedRequest?.method).toBe('GET')
    const url = new URL(capturedRequest!.url)
    expect(url.pathname).toBe('/api/v1/domains/dom%2F123/unsubscribes')
    expect(url.searchParams.get('q')).toBe('jane@')
    expect(url.searchParams.get('scope')).toBe('domain')
    expect(url.searchParams.get('limit')).toBe('50')
    expect(url.searchParams.get('cursor')).toBe('page_1')
    // The domainId rides the path, never the query.
    expect(url.searchParams.get('domainId')).toBeNull()
    expect(result.domainHost).toBe('send.example.com')
    expect(result.data[0]?.scope).toBe('domain')
    expect(result.pagination.hasMore).toBe(true)
  })

  it('sends no query string when only the domainId is given', async () => {
    let capturedUrl: URL | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/domains/dom_123/unsubscribes',
        ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json(PAGE)
        }
      )
    )

    const { client } = makeTestHttpClient()
    const domains = createDomainsResource(client)

    await domains.unsubscribes.list({ domainId: 'dom_123' })

    expect(capturedUrl?.search).toBe('')
  })

  it('returns the full BrewRawResponse when called with { raw: true }', async () => {
    server.use(
      http.get('https://brew.new/api/v1/domains/dom_123/unsubscribes', () =>
        HttpResponse.json(PAGE, {
          status: 200,
          headers: { 'x-request-id': 'req_raw_unsubscribes' },
        })
      )
    )

    const { client } = makeTestHttpClient()
    const domains = createDomainsResource(client)

    const raw = await domains.unsubscribes.list(
      { domainId: 'dom_123' },
      { raw: true }
    )

    expect(raw.status).toBe(200)
    expect(raw.requestId).toBe('req_raw_unsubscribes')
    expect(raw.data.data).toHaveLength(1)
  })
})
