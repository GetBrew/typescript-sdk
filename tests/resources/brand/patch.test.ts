import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createBrandResource } from '../../../src/resources/brand/resource'
import { createUpdateBrand } from '../../../src/resources/brand/patch'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const BRAND = {
  brandId: 'brand_123',
  domain: 'acme.com',
  status: 'completed' as const,
  ready: true,
}

describe('brand.patch', () => {
  it('PATCHes /v1/brand with the body and echoes the touched fields', async () => {
    let captured: Request | undefined
    let body: unknown
    server.use(
      http.patch('https://brew.new/api/v1/brand', async ({ request }) => {
        captured = request.clone()
        body = await request.json()
        return HttpResponse.json({
          brand: BRAND,
          identity: { brandName: 'Acme Renamed' },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const patch = createUpdateBrand(client)

    const result = await patch({
      identity: { brandName: 'Acme Renamed' },
    })

    expect(captured?.method).toBe('PATCH')
    expect(new URL(captured!.url).pathname).toBe('/api/v1/brand')
    expect(body).toEqual({ identity: { brandName: 'Acme Renamed' } })
    expect(result.identity?.brandName).toBe('Acme Renamed')
  })

  it('sends emailDesign / imageStyle markdown strings', async () => {
    let body: unknown
    server.use(
      http.patch('https://brew.new/api/v1/brand', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({
          brand: BRAND,
          emailDesign: '# New email design',
        })
      })
    )

    const { client } = makeTestHttpClient()
    const patch = createUpdateBrand(client)

    const result = await patch({ emailDesign: '# New email design' })

    expect(body).toEqual({ emailDesign: '# New email design' })
    expect(result.emailDesign).toBe('# New email design')
  })

  it('is exposed on the resource as both `patch` and `update` (same fn)', () => {
    const { client } = makeTestHttpClient()
    const brand = createBrandResource(client)
    expect(typeof brand.patch).toBe('function')
    expect(brand.update).toBe(brand.patch)
    // The removed sub-resource methods are gone.
    expect('getIdentity' in brand).toBe(false)
    expect('getEmailDesign' in brand).toBe(false)
    expect('getImageStyle' in brand).toBe(false)
    expect('getLogos' in brand).toBe(false)
    expect('updateIdentity' in brand).toBe(false)
  })

  it('returns the full BrewRawResponse when called with { raw: true }', async () => {
    server.use(
      http.patch('https://brew.new/api/v1/brand', () =>
        HttpResponse.json(
          { brand: BRAND, imageStyle: '# Image style' },
          { status: 200, headers: { 'x-request-id': 'req_brand_patch' } }
        )
      )
    )
    const { client } = makeTestHttpClient()
    const patch = createUpdateBrand(client)

    const raw = await patch({ imageStyle: '# Image style' }, { raw: true })

    expect(raw.status).toBe(200)
    expect(raw.requestId).toBe('req_brand_patch')
    expect(raw.data.imageStyle).toBe('# Image style')
  })
})
