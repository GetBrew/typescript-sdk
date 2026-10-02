import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { BrewApiError } from '../../../src/core/errors'
import type {
  BrewErrorCode,
  BrewRawResponse,
  ContentAddImageBatchResponse,
  ContentAddImageRequest,
  ContentAddImageResponse,
} from '../../../src/index'
import { createAddImage } from '../../../src/resources/content/add-image'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const ADD_IMAGE_URL = 'https://brew.new/api/v1/content/add-image'

const ADDED = {
  url: 'https://cdn.brew.new/brand-assets/k123/logo.png',
  width: 512,
  height: 256,
  aspectRatio: '2:1',
  assetId: '5bc912f9',
} satisfies ContentAddImageResponse

const UPLOAD_ID = 'imgup_abcdefghijklmnopqrstu'

function errorBody({ code, message }: { code: string; message: string }) {
  return {
    error: {
      code,
      message,
      suggestion: 'See the message.',
      docs: 'https://docs.brew.new/api-reference/api/errors',
    },
  }
}

describe('content.addImage', () => {
  it('adds one public imageUrl and returns the library row (url … assetId)', async () => {
    let body: unknown
    server.use(
      http.post(ADD_IMAGE_URL, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(ADDED)
      })
    )

    const { client } = makeTestHttpClient()
    const result = await createAddImage(client)({
      imageUrl: 'https://acme.com/logo.png',
    })

    expect(body).toEqual({ imageUrl: 'https://acme.com/logo.png' })
    expect(result).toEqual(ADDED)
    expectTypeOf(result).toEqualTypeOf<ContentAddImageResponse>()
    expectTypeOf(result).toHaveProperty('assetId')
  })

  it('adds an uploaded file by uploadId', async () => {
    let captured: Request | undefined
    server.use(
      http.post(ADD_IMAGE_URL, ({ request }) => {
        captured = request.clone()
        return HttpResponse.json(ADDED)
      })
    )

    const { client } = makeTestHttpClient()
    const result = await createAddImage(client)({ uploadId: UPLOAD_ID })

    expect(await captured!.json()).toEqual({ uploadId: UPLOAD_ID })
    // Still a keyed POST: a retry after a lost answer replays it.
    expect(captured?.headers.get('idempotency-key')).toBeTruthy()
    expect(result.assetId).toBe('5bc912f9')
    expectTypeOf(result).toEqualTypeOf<ContentAddImageResponse>()
  })

  it('types an imageUrls batch as the 202 { accepted, skipped, runId } it answers', async () => {
    server.use(
      http.post(ADD_IMAGE_URL, () =>
        HttpResponse.json(
          { accepted: 2, skipped: 1, runId: 'run_123' },
          { status: 202 }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const result = await createAddImage(client)({
      imageUrls: [
        'https://acme.com/a.png',
        'https://acme.com/b.png',
        'https://acme.com/a.png',
      ],
    })

    expect(result).toEqual({ accepted: 2, skipped: 1, runId: 'run_123' })
    expectTypeOf(result).toEqualTypeOf<ContentAddImageBatchResponse>()
  })

  it('types a runtime-chosen input as either answer', () => {
    const { client } = makeTestHttpClient()
    const addImage = createAddImage(client)
    const dynamic = (input: ContentAddImageRequest) => addImage(input)
    const dynamicRaw = (input: ContentAddImageRequest) =>
      addImage(input, { raw: true })

    expectTypeOf(dynamic).returns.resolves.toEqualTypeOf<
      ContentAddImageResponse | ContentAddImageBatchResponse
    >()
    expectTypeOf(dynamicRaw).returns.resolves.toEqualTypeOf<
      BrewRawResponse<ContentAddImageResponse | ContentAddImageBatchResponse>
    >()
  })

  it.each([
    {
      status: 404,
      code: 'UPLOAD_NOT_FOUND',
      message: 'This upload is unknown or expired.',
    },
    {
      status: 409,
      code: 'UPLOAD_NOT_RECEIVED',
      message: 'The file was never sent to the upload URL.',
    },
    {
      status: 409,
      code: 'UPLOAD_IN_PROGRESS',
      message: 'Another call is converting this upload; retry shortly.',
    },
    {
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'The file is larger than 20 MB.',
    },
    {
      status: 422,
      code: 'CONTENT_OPERATION_FAILED',
      message: 'The uploaded file could not be decoded as an image.',
    },
  ])(
    'maps $status $code for an uploadId to a BrewApiError, not retried',
    async ({ status, code, message }) => {
      let calls = 0
      server.use(
        http.post(ADD_IMAGE_URL, () => {
          calls++
          return HttpResponse.json(errorBody({ code, message }), { status })
        })
      )

      const { client } = makeTestHttpClient()
      const error = await createAddImage(client)({ uploadId: UPLOAD_ID }).catch(
        (caught: unknown) => caught
      )

      expect(error).toBeInstanceOf(BrewApiError)
      expect((error as BrewApiError).status).toBe(status)
      expect((error as BrewApiError).code).toBe(code)
      expect((error as BrewApiError).message).toBe(message)
      expect(calls).toBe(1)
    }
  )

  it('lists the upload codes in BrewErrorCode', () => {
    expectTypeOf<'UPLOAD_NOT_FOUND'>().toExtend<BrewErrorCode>()
    expectTypeOf<'UPLOAD_NOT_RECEIVED'>().toExtend<BrewErrorCode>()
    expectTypeOf<'UPLOAD_IN_PROGRESS'>().toExtend<BrewErrorCode>()
    expectTypeOf<'PAYLOAD_TOO_LARGE'>().toExtend<BrewErrorCode>()
  })

  it('supports the { raw: true } escape hatch for each input', async () => {
    server.use(
      http.post(ADD_IMAGE_URL, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        if ('imageUrls' in body) {
          return HttpResponse.json(
            { accepted: 1, skipped: 0, runId: 'run_1' },
            { status: 202, headers: { 'x-request-id': 'req_batch' } }
          )
        }
        return HttpResponse.json(ADDED, {
          headers: { 'x-request-id': 'req_single' },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const addImage = createAddImage(client)

    const single = await addImage({ uploadId: UPLOAD_ID }, { raw: true })
    const batch = await addImage(
      { imageUrls: ['https://acme.com/a.png'] },
      { raw: true }
    )

    expect(single.status).toBe(200)
    expect(single.requestId).toBe('req_single')
    expect(single.data).toEqual(ADDED)
    expectTypeOf(single).toEqualTypeOf<
      BrewRawResponse<ContentAddImageResponse>
    >()
    expect(batch.status).toBe(202)
    expect(batch.requestId).toBe('req_batch')
    expectTypeOf(batch).toEqualTypeOf<
      BrewRawResponse<ContentAddImageBatchResponse>
    >()
  })
})
