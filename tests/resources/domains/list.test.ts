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
})
