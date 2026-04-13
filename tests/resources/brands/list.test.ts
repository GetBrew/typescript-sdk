import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListBrands } from '../../../src/resources/brands/list'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('brands.list', () => {
  it('sends GET /v1/brands and returns the brands envelope', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/brands', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          brands: [
            {
              brandId: 'brand_123',
              brandUrl: 'https://vercel.com',
            },
          ],
        })
      })
    )

    const { client } = makeTestHttpClient()
    const list = createListBrands(client)

    const result = await list()

    expect(capturedRequest?.method).toBe('GET')
    expect(new URL(capturedRequest!.url).pathname).toBe('/api/v1/brands')
    expect(result.brands).toHaveLength(1)
    expect(result.brands[0]?.brandId).toBe('brand_123')
    expect(result.brands[0]?.brandUrl).toBe('https://vercel.com')
  })
})
