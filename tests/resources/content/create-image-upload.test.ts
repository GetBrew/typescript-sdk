import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { createBrewClient } from '../../../src/client'
import { BrewApiError } from '../../../src/core/errors'
import type {
  ContentImageUploadCreateRequest,
  ContentImageUploadCreateResponse,
} from '../../../src/index'
import { createCreateImageUpload } from '../../../src/resources/content/create-image-upload'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const UPLOADS_URL = 'https://brew.new/api/v1/content/image-uploads'

const OPENED = {
  uploadId: 'imgup_abcdefghijklmnopqrstu',
  uploadUrl:
    'https://brew-uploads.convex.site/brand-image-upload?uploadId=imgup_abcdefghijklmnopqrstu&token=secret',
  expiresAt: '2026-10-02T12:15:00.000Z',
  maxBytes: 20_000_000,
} satisfies ContentImageUploadCreateResponse

describe('content.createImageUpload', () => {
  it('POSTs { fileName, contentType, size } and returns the open upload (201)', async () => {
    let captured: Request | undefined
    server.use(
      http.post(UPLOADS_URL, ({ request }) => {
        captured = request.clone()
        return HttpResponse.json(OPENED, { status: 201 })
      })
    )

    const { client } = makeTestHttpClient()
    const createImageUpload = createCreateImageUpload(client)

    const result = await createImageUpload({
      fileName: 'logo.png',
      contentType: 'image/png',
      size: 2048,
    })

    expect(captured?.method).toBe('POST')
    expect(captured?.headers.get('content-type')).toBe('application/json')
    expect(await captured!.json()).toEqual({
      fileName: 'logo.png',
      contentType: 'image/png',
      size: 2048,
    })
    expect(result).toEqual(OPENED)
    expectTypeOf(result).toEqualTypeOf<ContentImageUploadCreateResponse>()
  })

  it('types contentType as the seven image types the API accepts', () => {
    expectTypeOf<
      ContentImageUploadCreateRequest['contentType']
    >().toEqualTypeOf<
      | 'image/png'
      | 'image/jpeg'
      | 'image/gif'
      | 'image/webp'
      | 'image/avif'
      | 'image/tiff'
      | 'image/svg+xml'
    >()
  })

  it('surfaces 20 open uploads as 429 RATE_LIMITED with retryAfter', async () => {
    server.use(
      http.post(UPLOADS_URL, () =>
        HttpResponse.json(
          {
            error: {
              code: 'RATE_LIMITED',
              type: 'rate_limit',
              message: 'This brand already has 20 image uploads open.',
              suggestion: 'Finish or let an open upload expire, then retry.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          // Over the SDK's 60 s ceiling: thrown at once, not slept out.
          { status: 429, headers: { 'retry-after': '600' } }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const error = await createCreateImageUpload(client)({
      fileName: 'logo.png',
      contentType: 'image/png',
      size: 2048,
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(BrewApiError)
    expect((error as BrewApiError).status).toBe(429)
    expect((error as BrewApiError).code).toBe('RATE_LIMITED')
    expect((error as BrewApiError).retryAfter).toBe(600)
  })

  describe('no replay, so no retry by default', () => {
    // The route never replays its answer (it carries a bearer URL), so a
    // retry after a lost answer opens a second upload that holds one of the
    // brand's 20 slots for 15 minutes.
    const INPUT = {
      fileName: 'logo.png',
      contentType: 'image/png',
      size: 2048,
    } as const

    function unavailable(): Response {
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

    it('sends no Idempotency-Key, not even one the caller passes', async () => {
      const keys: Array<string | null> = []
      server.use(
        http.post(UPLOADS_URL, ({ request }) => {
          keys.push(request.headers.get('idempotency-key'))
          return HttpResponse.json(OPENED, { status: 201 })
        })
      )
      const { client } = makeTestHttpClient()
      const createImageUpload = createCreateImageUpload(client)

      await createImageUpload(INPUT)
      await createImageUpload(INPUT, { idempotencyKey: 'caller-key' })

      expect(keys).toEqual([null, null])
    })

    it.each([
      { failure: 'a 503', answer: unavailable },
      { failure: 'a dropped connection', answer: () => HttpResponse.error() },
    ])(
      'makes one attempt on $failure, whatever the client maxRetries',
      async ({ answer }) => {
        let calls = 0
        server.use(
          http.post(UPLOADS_URL, () => {
            calls++
            return answer()
          })
        )
        // The client-wide setting is for routes that replay; it does not
        // apply here.
        const { client } = makeTestHttpClient({
          configOverrides: { maxRetries: 2 },
        })

        const error = await createCreateImageUpload(client)(INPUT).catch(
          (caught: unknown) => caught
        )

        expect(error).toBeInstanceOf(Error)
        expect(calls).toBe(1)
      }
    )

    it('retries when the caller passes maxRetries for the request', async () => {
      let calls = 0
      server.use(
        http.post(UPLOADS_URL, () => {
          calls++
          return calls === 1
            ? unavailable()
            : HttpResponse.json(OPENED, { status: 201 })
        })
      )
      const { client } = makeTestHttpClient()

      const result = await createCreateImageUpload(client)(INPUT, {
        maxRetries: 1,
      })

      expect(calls).toBe(2)
      expect(result).toEqual(OPENED)
    })
  })

  it('supports the { raw: true } escape hatch', async () => {
    server.use(
      http.post(UPLOADS_URL, () =>
        HttpResponse.json(OPENED, {
          status: 201,
          headers: { 'x-request-id': 'req_upload_open' },
        })
      )
    )

    const { client } = makeTestHttpClient()
    const raw = await createCreateImageUpload(client)(
      { fileName: 'logo.svg', contentType: 'image/svg+xml', size: 512 },
      { raw: true }
    )

    expect(raw.status).toBe(201)
    expect(raw.requestId).toBe('req_upload_open')
    expect(raw.data).toEqual(OPENED)
    expectTypeOf(raw.data).toEqualTypeOf<ContentImageUploadCreateResponse>()
  })

  it('is wired as brew.content.createImageUpload', async () => {
    let captured: Request | undefined
    server.use(
      http.post(UPLOADS_URL, ({ request }) => {
        captured = request
        return HttpResponse.json(OPENED, { status: 201 })
      })
    )

    const brew = createBrewClient({ apiKey: 'brew_test_abc' })
    const result = await brew.content.createImageUpload({
      fileName: 'logo.png',
      contentType: 'image/png',
      size: 2048,
    })

    expect(captured?.headers.get('authorization')).toBe('Bearer brew_test_abc')
    expect(result.uploadId).toBe(OPENED.uploadId)
  })
})
