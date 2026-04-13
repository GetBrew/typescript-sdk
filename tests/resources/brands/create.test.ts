import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createCreateBrand } from '../../../src/resources/brands/create'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('brands.create', () => {
  it('sends POST /v1/brands with { brandUrl } and returns the create envelope', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/brands', async ({ request }) => {
        capturedRequest = request.clone()
        capturedBody = await request.json()
        return HttpResponse.json({ brandId: 'brand_123' })
      })
    )

    const { client } = makeTestHttpClient()
    const create = createCreateBrand(client)

    const result = await create({ brandUrl: 'https://vercel.com' })

    expect(capturedRequest?.method).toBe('POST')
    expect(capturedBody).toEqual({ brandUrl: 'https://vercel.com' })
    expect(result.brandId).toBe('brand_123')
    expect(capturedRequest?.headers.get('idempotency-key')).toBeTruthy()
  })

  it('uses a caller provided idempotency key when passed in request options', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.post('https://brew.new/api/v1/brands', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ brandId: 'brand_456' })
      })
    )

    const { client } = makeTestHttpClient()
    const create = createCreateBrand(client)

    await create(
      { brandUrl: 'https://linear.app' },
      { idempotencyKey: 'brand-create-001' }
    )

    expect(capturedRequest?.headers.get('idempotency-key')).toBe(
      'brand-create-001'
    )
  })
})
