import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { createBrewClient } from '../../../src/client'
import { BrewApiError } from '../../../src/core/errors'
import type { BrandImageDeleteResponse } from '../../../src/index'
import { createDeleteBrandImage } from '../../../src/resources/brand/delete-image'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const IMAGES_URL = 'https://brew.new/api/v1/brand/images'

describe('brand.deleteImage', () => {
  it('DELETEs /v1/brand/images/{assetId} and returns { assetId, deleted }', async () => {
    let captured: Request | undefined
    server.use(
      http.delete(`${IMAGES_URL}/:assetId`, ({ request }) => {
        captured = request.clone()
        return HttpResponse.json({ assetId: '5bc912f9', deleted: true })
      })
    )

    const { client } = makeTestHttpClient()
    const deleteImage = createDeleteBrandImage(client)

    const result = await deleteImage('5bc912f9')

    expect(captured?.method).toBe('DELETE')
    expect(new URL(captured!.url).pathname).toBe(
      '/api/v1/brand/images/5bc912f9'
    )
    // Identified entirely by the URL: no body, and DELETE carries no key.
    expect(await captured!.text()).toBe('')
    expect(captured?.headers.get('idempotency-key')).toBeNull()
    expect(result).toEqual({ assetId: '5bc912f9', deleted: true })
    expectTypeOf(result).toEqualTypeOf<BrandImageDeleteResponse>()
  })

  it('resolves deleted: false for an id not in the library (idempotent)', async () => {
    server.use(
      http.delete(`${IMAGES_URL}/:assetId`, ({ params }) =>
        HttpResponse.json({ assetId: params.assetId, deleted: false })
      )
    )

    const { client } = makeTestHttpClient()
    const result = await createDeleteBrandImage(client)('0000beef')

    expect(result).toEqual({ assetId: '0000beef', deleted: false })
  })

  it('encodes the assetId into the path', async () => {
    let path: string | undefined
    server.use(
      http.delete(`${IMAGES_URL}/:assetId`, ({ request }) => {
        path = new URL(request.url).pathname
        return HttpResponse.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              type: 'invalid_request',
              message: 'assetId must be 8 lowercase hex characters.',
              suggestion: 'Pass an assetId from GET /v1/brand/images.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
              param: 'assetId',
            },
          },
          { status: 400 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const error = await createDeleteBrandImage(client)('a/b?c').catch(
      (caught: unknown) => caught
    )

    expect(path).toBe('/api/v1/brand/images/a%2Fb%3Fc')
    expect(error).toBeInstanceOf(BrewApiError)
    expect((error as BrewApiError).param).toBe('assetId')
  })

  it('surfaces a logo refusal as 400 INVALID_REQUEST', async () => {
    let calls = 0
    server.use(
      http.delete(`${IMAGES_URL}/:assetId`, () => {
        calls++
        return HttpResponse.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              type: 'invalid_request',
              message:
                'This asset is a logo. Manage logos on the Assets page in Brew.',
              suggestion: 'Delete a brand or generated image instead.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 400 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const error = await createDeleteBrandImage(client)('11112222').catch(
      (caught: unknown) => caught
    )

    expect(error).toBeInstanceOf(BrewApiError)
    expect((error as BrewApiError).status).toBe(400)
    expect((error as BrewApiError).code).toBe('INVALID_REQUEST')
    // A 400 fails the same way every time: never retried.
    expect(calls).toBe(1)
  })

  it('retries a transient 503 (DELETE is safe to repeat)', async () => {
    let calls = 0
    server.use(
      http.delete(`${IMAGES_URL}/:assetId`, () => {
        calls++
        if (calls === 1) {
          return HttpResponse.json(
            {
              error: {
                code: 'SERVICE_UNAVAILABLE',
                type: 'service_unavailable',
                message: 'Try again.',
                suggestion: 'Retry.',
                docs: 'https://docs.brew.new/api-reference/api/errors',
              },
            },
            { status: 503 }
          )
        }
        return HttpResponse.json({ assetId: '5bc912f9', deleted: true })
      })
    )

    const { client } = makeTestHttpClient()
    const result = await createDeleteBrandImage(client)('5bc912f9')

    expect(calls).toBe(2)
    expect(result.deleted).toBe(true)
  })

  it('supports the { raw: true } escape hatch', async () => {
    server.use(
      http.delete(`${IMAGES_URL}/:assetId`, () =>
        HttpResponse.json(
          { assetId: '5bc912f9', deleted: true },
          { headers: { 'x-request-id': 'req_delete_image' } }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const raw = await createDeleteBrandImage(client)('5bc912f9', {
      raw: true,
    })

    expect(raw.status).toBe(200)
    expect(raw.requestId).toBe('req_delete_image')
    expect(raw.data).toEqual({ assetId: '5bc912f9', deleted: true })
    expectTypeOf(raw.data).toEqualTypeOf<BrandImageDeleteResponse>()
  })

  it('is wired as brew.brand.deleteImage and sends the pinned brand', async () => {
    let captured: Request | undefined
    server.use(
      http.delete(`${IMAGES_URL}/:assetId`, ({ request }) => {
        captured = request
        return HttpResponse.json({ assetId: '5bc912f9', deleted: true })
      })
    )

    const brew = createBrewClient({ apiKey: 'brew_test_abc' }).withBrand(
      'brand_123'
    )
    const result = await brew.brand.deleteImage('5bc912f9')

    expect(captured?.headers.get('x-brand-id')).toBe('brand_123')
    expect(captured?.headers.get('authorization')).toBe('Bearer brew_test_abc')
    expect(result.deleted).toBe(true)
  })
})
