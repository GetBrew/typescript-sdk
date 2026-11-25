import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from './msw/server'

describe('msw smoke', () => {
  it('intercepts a fetch call via server.use() and returns the mocked body', async () => {
    server.use(
      http.get('https://brew.new/api/v1/health', () => {
        return HttpResponse.json(
          { status: 'ok', version: 'smoke' },
          {
            status: 200,
            headers: { 'x-request-id': 'req_smoke_123' },
          }
        )
      })
    )

    const response = await fetch('https://brew.new/api/v1/health')

    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toBe('req_smoke_123')

    const body = (await response.json()) as { status: string; version: string }
    expect(body).toEqual({ status: 'ok', version: 'smoke' })
  })

  it('rejects unhandled requests so accidental real network calls fail loudly', async () => {
    await expect(
      fetch('https://brew.new/api/v1/this-endpoint-is-not-mocked')
    ).rejects.toThrow()
  })
})
