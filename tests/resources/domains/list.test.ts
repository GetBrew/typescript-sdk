import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListDomains } from '../../../src/resources/domains/list'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('domains.list', () => {
  it('sends GET /v1/domains and returns the { data, pagination } envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/domains', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          data: [
            {
              domainId: 'dom_123',
              domainUrl: 'https://tiger-brew-testing-2.com',
            },
          ],
          pagination: { limit: 100, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListDomains(client)

    const result = await list()

    expect(capturedRequest?.method).toBe('GET')
    expect(new URL(capturedRequest!.url).pathname).toBe('/api/v1/domains')
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.domainId).toBe('dom_123')
    expect(result.data[0]?.domainUrl).toBe('https://tiger-brew-testing-2.com')
  })

  it('detail mode: domainId returns the single-row page; sendableOnly filters the list', async () => {
    let detailUrl: string | undefined
    let listUrl: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/domains', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('domainId')) {
          detailUrl = request.url
          // Detail = single-row page `{ data: [row] }`, no pagination.
          return HttpResponse.json({
            data: [{ domainId: 'dom_123', sendable: true }],
          })
        }
        listUrl = request.url
        return HttpResponse.json({
          data: [{ domainId: 'dom_123', sendable: true }],
          pagination: { limit: 100, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListDomains(client)

    const detail = await list({ domainId: 'dom_123' })
    expect(new URL(detailUrl!).searchParams.get('domainId')).toBe('dom_123')
    expect(detail.data).toHaveLength(1)
    expect(detail.pagination).toBeUndefined()

    await list({ sendableOnly: true })
    expect(new URL(listUrl!).searchParams.get('sendableOnly')).toBe('true')
  })
})
