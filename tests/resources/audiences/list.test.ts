import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListAudiences } from '../../../src/resources/audiences/list'
import type { BrewRawResponse } from '../../../src/types'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

import type { ListAudiencesResponse } from '../../../src/resources/audiences/list'

describe('audiences.list', () => {
  it('sends GET /v1/audiences and returns the audiences envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/audiences', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          audiences: [
            {
              audienceId: 'aud_123',
              audienceName: 'Nordic Founders',
            },
            {
              audienceId: 'aud_456',
              audienceName: 'Product Updates',
            },
          ],
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListAudiences(client)

    const result = await list()

    expect(capturedRequest?.method).toBe('GET')
    expect(new URL(capturedRequest!.url).pathname).toBe('/api/v1/audiences')
    expect(result.audiences).toHaveLength(2)
    expect(result.audiences[0]?.audienceId).toBe('aud_123')
    expect(result.audiences[0]?.audienceName).toBe('Nordic Founders')
  })

  it('returns the unwrapped envelope by default', async () => {
    server.use(
      http.get('https://brew.new/api/v1/audiences', () =>
        HttpResponse.json({
          audiences: [{ audienceId: 'aud_1', audienceName: 'Beta' }],
        })
      )
    )
    const { client } = makeTestHttpClient()
    const list = createListAudiences(client)

    const result = await list()

    expect(Array.isArray(result.audiences)).toBe(true)
    // Default mode does not surface raw transport metadata.
    expect(
      (result as unknown as BrewRawResponse<ListAudiencesResponse>).status
    ).toBeUndefined()
  })

  it('returns the full BrewRawResponse when called with { raw: true }', async () => {
    server.use(
      http.get('https://brew.new/api/v1/audiences', () =>
        HttpResponse.json(
          { audiences: [{ audienceId: 'aud_1', audienceName: 'Beta' }] },
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

    const raw = await list({ raw: true })

    expect(raw.status).toBe(200)
    expect(raw.requestId).toBe('req_raw_audiences')
    expect(raw.headers.get('x-request-id')).toBe('req_raw_audiences')
    expect(raw.data.audiences).toHaveLength(1)
  })
})
