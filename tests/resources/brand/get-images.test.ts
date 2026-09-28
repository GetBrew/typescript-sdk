import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetBrandImages } from '../../../src/resources/brand/get-images'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const IMAGE = {
  assetId: '5bc912f9',
  kind: 'generated' as const,
  url: 'https://cdn.brew.new/cnt/abc.png',
  description: 'Clerk user-profile component',
  width: 1056,
  height: 1002,
}

describe('brand.getImages', () => {
  it('browses GET /v1/brand/images and returns the { data, pagination } envelope', async () => {
    let captured: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/brand/images', ({ request }) => {
        captured = request
        return HttpResponse.json({
          data: [IMAGE],
          pagination: { limit: 20, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const getImages = createGetBrandImages(client)

    const result = await getImages({ limit: 20 })

    const url = new URL(captured!.url)
    expect(url.pathname).toBe('/api/v1/brand/images')
    // Browse mode: no semantic query, just pagination.
    expect(url.searchParams.get('q')).toBeNull()
    expect(url.searchParams.get('limit')).toBe('20')
    expect(result.data[0]?.url).toBe(IMAGE.url)
  })

  it('narrows by kind and orders by sort', async () => {
    let captured: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/brand/images', ({ request }) => {
        captured = request
        return HttpResponse.json({
          data: [IMAGE],
          pagination: { limit: 20, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const getImages = createGetBrandImages(client)

    const result = await getImages({ kind: 'generated', sort: 'oldest' })

    const params = new URL(captured!.url).searchParams
    expect(params.get('kind')).toBe('generated')
    expect(params.get('sort')).toBe('oldest')
    expect(result.data[0]?.assetId).toBe('5bc912f9')
  })

  it('semantic search: q + kind are serialized into the query', async () => {
    let captured: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/brand/images', ({ request }) => {
        captured = request
        return HttpResponse.json({
          data: [IMAGE],
          pagination: { limit: 20, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const getImages = createGetBrandImages(client)

    await getImages({ q: 'user profile component', kind: 'brand' })

    const params = new URL(captured!.url).searchParams
    expect(params.get('q')).toBe('user profile component')
    expect(params.get('kind')).toBe('brand')
    expect(params.get('type')).toBeNull()
    expect(params.get('aspectRatio')).toBeNull()
  })
})
