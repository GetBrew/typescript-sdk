import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetBrandImages } from '../../../src/resources/brand/get-images'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const IMAGE = {
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

  it('semantic search: q + type + aspectRatio are serialized into the query', async () => {
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

    await getImages({
      q: 'user profile component',
      type: 'screenshot',
      aspectRatio: '16:9',
    })

    const params = new URL(captured!.url).searchParams
    expect(params.get('q')).toBe('user profile component')
    expect(params.get('type')).toBe('screenshot')
    expect(params.get('aspectRatio')).toBe('16:9')
  })
})
