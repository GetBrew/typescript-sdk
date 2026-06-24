import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListAudiences } from '../../../src/resources/audiences/list'
import type { BrewRawResponse } from '../../../src/types'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

import type { ListAudiencesResponse } from '../../../src/resources/audiences/list'

const PAGINATION = { limit: 100, cursor: null, hasMore: false }

describe('audiences.list', () => {
  it('sends GET /v1/audiences and returns the { data, pagination } envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/audiences', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          data: [
            {
              audienceId: 'aud_123',
              audienceName: 'Nordic Founders',
            },
            {
              audienceId: 'aud_456',
              audienceName: 'Product Updates',
            },
          ],
          pagination: PAGINATION,
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListAudiences(client)

    const result = await list()

    expect(capturedRequest?.method).toBe('GET')
    expect(new URL(capturedRequest!.url).pathname).toBe('/api/v1/audiences')
    expect(result.data).toHaveLength(2)
    expect(result.data[0]?.audienceId).toBe('aud_123')
    expect(result.data[0]?.audienceName).toBe('Nordic Founders')
  })

  it('returns the unwrapped envelope by default', async () => {
    server.use(
      http.get('https://brew.new/api/v1/audiences', () =>
        HttpResponse.json({
          data: [{ audienceId: 'aud_1', audienceName: 'Beta' }],
          pagination: PAGINATION,
        })
      )
    )
    const { client } = makeTestHttpClient()
    const list = createListAudiences(client)

    const result = await list()

    expect(Array.isArray(result.data)).toBe(true)
    // Default mode does not surface raw transport metadata.
    expect(
      (result as unknown as BrewRawResponse<ListAudiencesResponse>).status
    ).toBeUndefined()
  })

  it('returns the full BrewRawResponse when called with { raw: true }', async () => {
    server.use(
      http.get('https://brew.new/api/v1/audiences', () =>
        HttpResponse.json(
          {
            data: [{ audienceId: 'aud_1', audienceName: 'Beta' }],
            pagination: PAGINATION,
          },
          {
            status: 200,
            headers: {
              'x-request-id': 'req_raw_audiences',
            },
          }
        )
      )
    )
    const { client } = makeTestHttpClient()
    const list = createListAudiences(client)

    const raw = await list(undefined, { raw: true })

    expect(raw.status).toBe(200)
    expect(raw.requestId).toBe('req_raw_audiences')
    expect(raw.headers.get('x-request-id')).toBe('req_raw_audiences')
    expect(raw.data.data).toHaveLength(1)
  })

  it('detail mode: audienceId + include count returns the single-row page', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/audiences', ({ request }) => {
        capturedRequest = request
        // Reads are flat: identity in the query; detail = `{ data: [row] }`.
        return HttpResponse.json({
          data: [{ audienceId: 'aud_123', audienceName: 'Beta', count: 42 }],
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListAudiences(client)

    const result = await list({ audienceId: 'aud_123', include: 'count' })

    const url = new URL(capturedRequest!.url)
    expect(url.searchParams.get('audienceId')).toBe('aud_123')
    expect(url.searchParams.get('include')).toBe('count')
    expect(result.data[0]?.count).toBe(42)
    expect(result.pagination).toBeUndefined()
  })
})
