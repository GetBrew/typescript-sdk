import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetBrand } from '../../../src/resources/brand/get'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('brand.get', () => {
  it('GETs /v1/brand and returns the { brand } envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/brand', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          brand: {
            brandId: 'brand_123',
            domain: 'acme.com',
            status: 'completed',
            ready: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const get = createGetBrand(client)

    const result = await get()

    expect(capturedRequest?.method).toBe('GET')
    expect(new URL(capturedRequest!.url).pathname).toBe('/api/v1/brand')
    expect(result.brand.brandId).toBe('brand_123')
    expect(result.brand.ready).toBe(true)
    expect(result.brand.status).toBe('completed')
  })

  it('returns the full BrewRawResponse when called with { raw: true }', async () => {
    server.use(
      http.get('https://brew.new/api/v1/brand', () =>
        HttpResponse.json(
          {
            brand: {
              brandId: 'brand_1',
              domain: 'acme.com',
              status: 'extracting',
              ready: false,
            },
          },
          { status: 200, headers: { 'x-request-id': 'req_brand' } }
        )
      )
    )
    const { client } = makeTestHttpClient()
    const get = createGetBrand(client)

    const raw = await get({ raw: true })

    expect(raw.status).toBe(200)
    expect(raw.requestId).toBe('req_brand')
    expect(raw.data.brand.ready).toBe(false)
  })
})
