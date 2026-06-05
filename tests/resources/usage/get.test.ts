import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetUsage } from '../../../src/resources/usage/get'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('usage.get', () => {
  it('GETs /v1/usage and returns the { usage } envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/usage', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          usage: {
            overview: {
              requests: 1200,
              successRate: 99.5,
              errors: 6,
              rateLimited: 1,
            },
            trend: [
              { date: '2026-04-01T00:00:00.000Z', requests: 40, errors: 0 },
            ],
            routes: [
              {
                route: '/v1/contacts',
                requests: 800,
                successRate: 100,
                topErrorCode: null,
              },
            ],
          },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const get = createGetUsage(client)

    const result = await get()

    expect(capturedRequest?.method).toBe('GET')
    expect(new URL(capturedRequest!.url).pathname).toBe('/api/v1/usage')
    expect(result.usage.overview.requests).toBe(1200)
    expect(result.usage.trend).toHaveLength(1)
    expect(result.usage.routes[0]?.route).toBe('/v1/contacts')
    expect(result.usage.routes[0]?.topErrorCode).toBeNull()
  })
})
