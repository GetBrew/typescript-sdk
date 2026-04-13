import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListAudiences } from '../../../src/resources/audiences/list'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

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
})
