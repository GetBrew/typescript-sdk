import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createDomainUnsubscribesResource } from '../../../src/resources/domains/unsubscribes/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const BASE = 'https://brew.new/api/v1/domains/dom_1/unsubscribes'

describe('domains.unsubscribes', () => {
  it('lists one page of a domain list, forwarding q, scope, limit and cursor', async () => {
    let url: URL | undefined
    server.use(
      http.get(BASE, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({
          data: [
            {
              email: 'ada@example.com',
              scope: 'domain',
              unsubscribedAt: '2026-09-27T12:00:00.000Z',
            },
          ],
          pagination: { limit: 10, cursor: null, hasMore: false },
        })
      })
    )
    const { client } = makeTestHttpClient()
    const unsubscribes = createDomainUnsubscribesResource(client)

    const page = await unsubscribes.list({
      domainId: 'dom_1',
      q: 'ada',
      scope: 'domain',
      limit: 10,
      cursor: 'c_1',
    })

    expect(url?.pathname).toBe('/api/v1/domains/dom_1/unsubscribes')
    expect(url?.searchParams.get('q')).toBe('ada')
    expect(url?.searchParams.get('scope')).toBe('domain')
    expect(url?.searchParams.get('limit')).toBe('10')
    expect(url?.searchParams.get('cursor')).toBe('c_1')
    expect(url?.searchParams.get('domainId')).toBeNull()
    expect(page.data[0]?.email).toBe('ada@example.com')
  })

  it('adds addresses in the body and carries the retry key', async () => {
    let request: Request | undefined
    let body: unknown
    server.use(
      http.post(BASE, async ({ request: incoming }) => {
        request = incoming
        body = await incoming.json()
        return HttpResponse.json({
          summary: { added: 1, alreadyUnsubscribed: 0, created: 0 },
          invalid: [],
        })
      })
    )
    const { client } = makeTestHttpClient()
    const unsubscribes = createDomainUnsubscribesResource(client)

    await unsubscribes.add(
      { domainId: 'dom_1', emails: ['ada@example.com'] },
      { idempotencyKey: 'add-once' }
    )

    expect(request?.method).toBe('POST')
    expect(body).toEqual({ emails: ['ada@example.com'] })
    expect(request?.headers.get('idempotency-key')).toBe('add-once')
  })

  it('removes one address, encoding it into the path', async () => {
    let pathname: string | undefined
    server.use(
      http.delete(`${BASE}/:email`, ({ request }) => {
        pathname = new URL(request.url).pathname
        return HttpResponse.json({
          email: 'ada+news@example.com',
          removed: true,
        })
      })
    )
    const { client } = makeTestHttpClient()
    const unsubscribes = createDomainUnsubscribesResource(client)

    await unsubscribes.remove({
      domainId: 'dom_1',
      email: 'ada+news@example.com',
    })

    expect(pathname).toBe(
      '/api/v1/domains/dom_1/unsubscribes/ada%2Bnews%40example.com'
    )
  })

  it('imports a CSV body with the column to read', async () => {
    let body: unknown
    server.use(
      http.post(`${BASE}/import`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({
          summary: { added: 2, alreadyUnsubscribed: 0, created: 1 },
          invalid: [],
        })
      })
    )
    const { client } = makeTestHttpClient()
    const unsubscribes = createDomainUnsubscribesResource(client)

    await unsubscribes.import({
      domainId: 'dom_1',
      csv: 'Email\nada@example.com\nbo@example.com',
      column: 'Email',
    })

    expect(body).toEqual({
      csv: 'Email\nada@example.com\nbo@example.com',
      column: 'Email',
    })
  })

  it('exports the list, narrowed by scope', async () => {
    let url: URL | undefined
    server.use(
      http.get(`${BASE}/export`, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({ csv: 'email\nada@example.com\n', count: 1 })
      })
    )
    const { client } = makeTestHttpClient()
    const unsubscribes = createDomainUnsubscribesResource(client)

    await unsubscribes.export({ domainId: 'dom_1', scope: 'all' })

    expect(url?.pathname).toBe('/api/v1/domains/dom_1/unsubscribes/export')
    expect(url?.searchParams.get('scope')).toBe('all')
  })
})
