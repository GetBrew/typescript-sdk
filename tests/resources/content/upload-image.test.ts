import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { createBrewClient } from '../../../src/client'
import {
  BrewApiError,
  BrewTimeoutError,
  BrewTransportError,
} from '../../../src/core/errors'
import type {
  HttpBytesInput,
  HttpClient,
  HttpRequestInput,
} from '../../../src/core/http'
import * as sdk from '../../../src/index'
import type {
  BrewRawResponse,
  ContentAddImageResponse,
  ContentImageUploadCreateResponse,
  UploadImageInput,
} from '../../../src/index'
import {
  IMAGE_UPLOAD_BYTES_DEFAULT_TIMEOUT_MS,
  createUploadImage,
} from '../../../src/resources/content/upload-image'
import { makeTestHttpClient } from '../../helpers/http-client'
import {
  rejectionOf,
  silentRoute,
  STALL_TEST,
  useLoopbackServers,
} from '../../helpers/loopback-server'
import { server } from '../../msw/server'

const OPEN_URL = 'https://brew.new/api/v1/content/image-uploads'
const ADD_IMAGE_URL = 'https://brew.new/api/v1/content/add-image'
const UPLOAD_PATH = 'https://uploads.brew.test/brand-image-upload'
const UPLOAD_ID = 'imgup_abcdefghijklmnopqrstu'
const UPLOAD_URL = `${UPLOAD_PATH}?uploadId=${UPLOAD_ID}&token=s3cr3t-upload-token`

const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

const ADDED = {
  url: 'https://cdn.brew.new/brand-assets/k123/logo.png',
  width: 512,
  height: 256,
  aspectRatio: '2:1',
  assetId: '5bc912f9',
} satisfies ContentAddImageResponse

function opened(uploadUrl: string = UPLOAD_URL) {
  return {
    uploadId: UPLOAD_ID,
    uploadUrl,
    expiresAt: '2026-10-02T12:15:00.000Z',
    maxBytes: 20_000_000,
  } satisfies ContentImageUploadCreateResponse
}

const RECEIPT = {
  uploadId: UPLOAD_ID,
  status: 'uploaded',
  size: PNG_BYTES.byteLength,
  expiresAt: '2026-10-02T12:30:00.000Z',
  next: 'Call add_image with this uploadId.',
}

/**
 * The three hops, each answering with `answers` (or the happy default), and
 * every request each one received, in order.
 */
function useUploadFlow({
  openAnswer = () => HttpResponse.json(opened(), { status: 201 }),
  uploadAnswer = () => HttpResponse.json(RECEIPT),
  addAnswer = () => HttpResponse.json(ADDED),
}: {
  openAnswer?: () => Response
  uploadAnswer?: (attempt: number) => Response
  addAnswer?: () => Response
} = {}) {
  const seen: {
    order: Array<'open' | 'upload' | 'add'>
    open: Array<Request>
    upload: Array<Request>
    add: Array<Request>
  } = { order: [], open: [], upload: [], add: [] }
  server.use(
    http.post(OPEN_URL, ({ request }) => {
      seen.order.push('open')
      seen.open.push(request.clone())
      return openAnswer()
    }),
    http.post(UPLOAD_PATH, ({ request }) => {
      seen.order.push('upload')
      seen.upload.push(request.clone())
      return uploadAnswer(seen.upload.length)
    }),
    http.post(ADD_IMAGE_URL, ({ request }) => {
      seen.order.push('add')
      seen.add.push(request.clone())
      return addAnswer()
    })
  )
  return seen
}

function apiError({
  code,
  status,
  message = `Refused: ${code}.`,
}: {
  code: string
  status: number
  message?: string
}): Response {
  return HttpResponse.json(
    {
      error: {
        code,
        message,
        suggestion: 'See the message.',
        docs: 'https://docs.brew.new/api-reference/api/errors',
      },
    },
    { status }
  )
}

/** The URL a `fetch` call names (the SDK always passes a string). */
function urlOf(input: Parameters<typeof globalThis.fetch>[0]): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

const servers = useLoopbackServers()

describe('content.uploadImage', () => {
  it('opens an upload, POSTs the bytes without the API key, then adds it', async () => {
    const seen = useUploadFlow()
    const brew = createBrewClient({ apiKey: 'brew_test_abc' }).withBrand(
      'brand_123'
    )

    const result = await brew.content.uploadImage({
      file: new Blob([PNG_BYTES]),
      fileName: 'logo.png',
    })

    expect(seen.order).toEqual(['open', 'upload', 'add'])

    const [open] = seen.open
    expect(await open!.json()).toEqual({
      fileName: 'logo.png',
      contentType: 'image/png',
      size: PNG_BYTES.byteLength,
    })
    expect(open!.headers.get('authorization')).toBe('Bearer brew_test_abc')
    expect(open!.headers.get('x-brand-id')).toBe('brand_123')

    const [upload] = seen.upload
    expect(upload!.url).toBe(UPLOAD_URL)
    expect(upload!.headers.get('authorization')).toBeNull()
    expect(upload!.headers.get('x-brand-id')).toBeNull()
    expect(upload!.headers.get('idempotency-key')).toBeNull()
    expect(upload!.headers.get('content-type')).toBe('image/png')
    expect(new Uint8Array(await upload!.arrayBuffer())).toEqual(PNG_BYTES)

    const [add] = seen.add
    expect(await add!.json()).toEqual({ uploadId: UPLOAD_ID })
    expect(add!.headers.get('authorization')).toBe('Bearer brew_test_abc')
    expect(add!.headers.get('x-brand-id')).toBe('brand_123')

    expect(result).toEqual(ADDED)
    expectTypeOf(result).toEqualTypeOf<ContentAddImageResponse>()
  })

  it.each([
    { kind: 'Blob', file: () => new Blob([PNG_BYTES]) },
    { kind: 'ArrayBuffer', file: () => PNG_BYTES.slice().buffer },
    { kind: 'Uint8Array', file: () => PNG_BYTES.slice() },
    { kind: 'Buffer', file: () => Buffer.from(PNG_BYTES) },
    {
      // A view into a larger buffer: only the view's bytes are the file.
      kind: 'Uint8Array view',
      file: () => new Uint8Array([0, 0, ...PNG_BYTES, 0]).subarray(2, 10),
    },
  ])(
    'sends a $kind file whole, sized by its bytes',
    async ({ file }: { file: () => UploadImageInput['file'] }) => {
      const seen = useUploadFlow()
      const { client } = makeTestHttpClient()

      await createUploadImage(client)({ file: file(), fileName: 'logo.png' })

      expect(await seen.open[0]!.json()).toMatchObject({
        size: PNG_BYTES.byteLength,
      })
      expect(new Uint8Array(await seen.upload[0]!.arrayBuffer())).toEqual(
        PNG_BYTES
      )
    }
  )

  it.each([
    { fileName: 'logo.png', contentType: 'image/png' },
    { fileName: 'photo.JPG', contentType: 'image/jpeg' },
    { fileName: 'photo.jpeg', contentType: 'image/jpeg' },
    { fileName: 'spinner.gif', contentType: 'image/gif' },
    { fileName: 'hero.webp', contentType: 'image/webp' },
    { fileName: 'hero.avif', contentType: 'image/avif' },
    { fileName: 'scan.tif', contentType: 'image/tiff' },
    { fileName: 'scan.TIFF', contentType: 'image/tiff' },
    { fileName: 'mark.final.svg', contentType: 'image/svg+xml' },
  ])(
    'infers $contentType from $fileName',
    async ({ fileName, contentType }) => {
      const seen = useUploadFlow()
      const { client } = makeTestHttpClient()

      await createUploadImage(client)({
        file: new Blob([PNG_BYTES]),
        fileName,
      })

      expect(await seen.open[0]!.json()).toMatchObject({
        fileName,
        contentType,
      })
      expect(seen.upload[0]!.headers.get('content-type')).toBe(contentType)
    }
  )

  it('lets an explicit contentType win over the extension', async () => {
    const seen = useUploadFlow()
    const { client } = makeTestHttpClient()

    await createUploadImage(client)({
      file: new Blob([PNG_BYTES]),
      fileName: 'export.bin',
      contentType: 'image/webp',
    })

    expect(await seen.open[0]!.json()).toMatchObject({
      fileName: 'export.bin',
      contentType: 'image/webp',
    })
  })

  it.each(['logo', 'logo.bmp', 'logo.png.zip', 'logo.', 'image.constructor'])(
    'refuses %j before any request when the type cannot be inferred',
    async (fileName) => {
      const seen = useUploadFlow()
      const { client } = makeTestHttpClient()

      const error = await rejectionOf({
        promise: createUploadImage(client)({
          file: new Blob([PNG_BYTES]),
          fileName,
        }),
      })

      expect(error).toBeInstanceOf(TypeError)
      expect((error as Error).message).toContain(JSON.stringify(fileName))
      expect((error as Error).message).toContain('contentType')
      expect(seen.order).toEqual([])
    }
  )

  it.each([
    { case: 'an empty file', size: 0, fileName: 'logo.png', limit: 'empty' },
    {
      case: 'a file over 20,000,000 bytes',
      size: 20_000_001,
      fileName: 'photo.png',
      limit: '20,000,000 bytes',
    },
    {
      case: 'an SVG over 2,097,152 bytes',
      size: 2_097_153,
      fileName: 'mark.svg',
      limit: '2,097,152 bytes',
    },
    {
      case: 'an SVG by contentType over 2,097,152 bytes',
      size: 2_097_153,
      fileName: 'export.bin',
      contentType: 'image/svg+xml' as const,
      limit: '2,097,152 bytes',
    },
  ])(
    'refuses $case before any request',
    async ({ size, fileName, contentType, limit }) => {
      const seen = useUploadFlow()
      const { client } = makeTestHttpClient()

      const error = await rejectionOf({
        promise: createUploadImage(client)({
          file: new Blob([new Uint8Array(size)]),
          fileName,
          ...(contentType === undefined ? {} : { contentType }),
        }),
      })

      expect(error).toBeInstanceOf(TypeError)
      expect((error as Error).message).toContain(JSON.stringify(fileName))
      expect((error as Error).message).toContain(limit)
      // Refused locally: no upload opened, so no slot held until it expires.
      expect(seen.order).toEqual([])
    }
  )

  it('accepts an SVG of exactly 2,097,152 bytes, and a PNG larger than that', async () => {
    const seen = useUploadFlow()
    const { client } = makeTestHttpClient()
    const uploadImage = createUploadImage(client)

    await uploadImage({
      file: new Blob([new Uint8Array(2_097_152)]),
      fileName: 'mark.svg',
    })
    await uploadImage({
      file: new Blob([new Uint8Array(2_097_153)]),
      fileName: 'photo.png',
    })

    expect(seen.order).toEqual([
      'open',
      'upload',
      'add',
      'open',
      'upload',
      'add',
    ])
  })

  it.each([
    { status: 404, code: 'UPLOAD_NOT_FOUND' },
    { status: 413, code: 'PAYLOAD_TOO_LARGE' },
    { status: 400, code: 'INVALID_REQUEST' },
  ])(
    'throws the upload URL refusal ($status $code) and never adds',
    async ({ status, code }) => {
      const seen = useUploadFlow({
        uploadAnswer: () =>
          HttpResponse.json(
            { error: { code, message: `Refused: ${code}.` } },
            { status }
          ),
      })
      const { client } = makeTestHttpClient()

      const error = await rejectionOf({
        promise: createUploadImage(client)({
          file: new Blob([PNG_BYTES]),
          fileName: 'logo.png',
        }),
      })

      expect(error).toBeInstanceOf(BrewApiError)
      expect((error as BrewApiError).status).toBe(status)
      expect((error as BrewApiError).code).toBe(code)
      expect(seen.order).toEqual(['open', 'upload'])
    }
  )

  it('retries a transient upload failure: a repeat POST keeps the first file', async () => {
    const seen = useUploadFlow({
      uploadAnswer: (attempt) =>
        attempt === 1
          ? apiError({ code: 'INTERNAL_ERROR', status: 502 })
          : HttpResponse.json(RECEIPT),
    })
    const { client } = makeTestHttpClient()

    const result = await createUploadImage(client)({
      file: new Blob([PNG_BYTES]),
      fileName: 'logo.png',
    })

    expect(seen.order).toEqual(['open', 'upload', 'upload', 'add'])
    expect(new Uint8Array(await seen.upload[1]!.arrayBuffer())).toEqual(
      PNG_BYTES
    )
    expect(result).toEqual(ADDED)
  })

  it.each([
    { code: 'RATE_LIMITED', status: 429 },
    { code: 'SERVICE_UNAVAILABLE', status: 503 },
  ])(
    'throws an open refusal ($status $code) after one attempt and sends nothing',
    async ({ code, status }) => {
      const seen = useUploadFlow({
        openAnswer: () => apiError({ code, status }),
      })
      // The client retries by default (maxRetries 2); opening an upload does
      // not, because the API never replays it and a retry holds a second slot.
      const { client } = makeTestHttpClient()

      const error = await rejectionOf({
        promise: createUploadImage(client)({
          file: new Blob([PNG_BYTES]),
          fileName: 'logo.png',
        }),
      })

      expect((error as BrewApiError).code).toBe(code)
      expect(seen.order).toEqual(['open'])
      expect(seen.open[0]?.headers.get('idempotency-key')).toBeNull()
    }
  )

  it.each([
    { status: 409, code: 'UPLOAD_NOT_RECEIVED' },
    { status: 409, code: 'UPLOAD_IN_PROGRESS' },
    { status: 422, code: 'CONTENT_OPERATION_FAILED' },
  ])('throws the add refusal ($status $code)', async ({ status, code }) => {
    const seen = useUploadFlow({
      addAnswer: () => apiError({ code, status }),
    })
    const { client } = makeTestHttpClient()

    const error = await rejectionOf({
      promise: createUploadImage(client)({
        file: new Blob([PNG_BYTES]),
        fileName: 'logo.png',
      }),
    })

    expect(error).toBeInstanceOf(BrewApiError)
    expect((error as BrewApiError).status).toBe(status)
    expect((error as BrewApiError).code).toBe(code)
    expect(seen.order).toEqual(['open', 'upload', 'add'])
  })

  it("sends every step through the client's configured fetch", async () => {
    useUploadFlow()
    const seenUrls: Array<string> = []
    const { client } = makeTestHttpClient({
      configOverrides: {
        fetch: (input, init) => {
          seenUrls.push(urlOf(input))
          return globalThis.fetch(input, init)
        },
      },
    })

    await createUploadImage(client)({
      file: new Blob([PNG_BYTES]),
      fileName: 'logo.png',
    })

    expect(seenUrls).toEqual([OPEN_URL, UPLOAD_URL, ADD_IMAGE_URL])
  })

  it('returns the add answer raw with { raw: true }', async () => {
    useUploadFlow({
      addAnswer: () =>
        HttpResponse.json(ADDED, { headers: { 'x-request-id': 'req_add' } }),
    })
    const { client } = makeTestHttpClient()

    const raw = await createUploadImage(client)(
      { file: new Blob([PNG_BYTES]), fileName: 'logo.png' },
      { raw: true }
    )

    expect(raw.status).toBe(200)
    expect(raw.requestId).toBe('req_add')
    expect(raw.data).toEqual(ADDED)
    expectTypeOf(raw).toEqualTypeOf<BrewRawResponse<ContentAddImageResponse>>()
  })

  it(
    "cancels the upload step with the caller's signal, and never adds",
    STALL_TEST,
    async () => {
      const { baseUrl, requests } = await servers.start({ route: silentRoute })
      const uploadUrl = `${new URL(baseUrl).origin}/upload?uploadId=${UPLOAD_ID}&token=t`
      const seen = useUploadFlow({
        openAnswer: () => HttpResponse.json(opened(uploadUrl), { status: 201 }),
      })
      const controller = new AbortController()
      const { client } = makeTestHttpClient({
        configOverrides: {
          // Abort once the bytes are on their way, not before.
          fetch: (input, init) => {
            if (urlOf(input) === uploadUrl) {
              setTimeout(() => {
                controller.abort()
              }, 50)
            }
            return globalThis.fetch(input, init)
          },
        },
      })

      const error = await rejectionOf({
        promise: createUploadImage(client)(
          { file: new Blob([PNG_BYTES]), fileName: 'logo.png' },
          { signal: controller.signal }
        ),
      })

      expect(error).toBe(controller.signal.reason)
      expect(requests.length).toBeLessThanOrEqual(1)
      expect(seen.order).toEqual(['open'])
    }
  )

  it(
    'bounds the upload step by timeoutMs, reporting the URL without its credential',
    STALL_TEST,
    async () => {
      const { baseUrl } = await servers.start({ route: silentRoute })
      const origin = new URL(baseUrl).origin
      const uploadUrl = `${origin}/upload?uploadId=${UPLOAD_ID}&token=s3cr3t`
      const seen = useUploadFlow({
        openAnswer: () => HttpResponse.json(opened(uploadUrl), { status: 201 }),
      })
      const { client } = makeTestHttpClient()

      const error = await rejectionOf({
        promise: createUploadImage(client)(
          { file: new Blob([PNG_BYTES]), fileName: 'logo.png' },
          { timeoutMs: 400, retryOnTimeout: false }
        ),
      })

      expect(error).toBeInstanceOf(BrewTimeoutError)
      expect(error).toBeInstanceOf(BrewTransportError)
      const timeout = error as BrewTimeoutError
      expect(timeout.timeoutMs).toBe(400)
      expect(timeout.url).toBe(`${origin}/upload`)
      expect(timeout.message).not.toContain('s3cr3t')
      expect(seen.order).toEqual(['open'])
    }
  )

  it('gives the bytes POST its own timeout floor and the caller options', async () => {
    const requests: Array<HttpRequestInput> = []
    const sends: Array<HttpBytesInput> = []
    const client: HttpClient = {
      request: <T>(input: HttpRequestInput) => {
        requests.push(input)
        const data =
          input.path === '/v1/content/image-uploads' ? opened() : ADDED
        return Promise.resolve({
          data: data as T,
          status: 200,
          headers: new Headers(),
          requestId: undefined,
        })
      },
      sendBytes: <T>(input: HttpBytesInput) => {
        sends.push(input)
        return Promise.resolve({
          data: RECEIPT as T,
          status: 200,
          headers: new Headers(),
          requestId: undefined,
        })
      },
    }
    const controller = new AbortController()

    await createUploadImage(client)(
      { file: new Blob([PNG_BYTES]), fileName: 'logo.png' },
      { signal: controller.signal, timeoutMs: 5_000, maxRetries: 1 }
    )

    expect(IMAGE_UPLOAD_BYTES_DEFAULT_TIMEOUT_MS).toBe(120_000)
    expect(sdk.IMAGE_UPLOAD_BYTES_DEFAULT_TIMEOUT_MS).toBe(120_000)
    expect(sends).toHaveLength(1)
    expect(sends[0]?.url).toBe(UPLOAD_URL)
    expect(sends[0]?.contentType).toBe('image/png')
    expect(sends[0]?.defaultTimeoutMs).toBe(120_000)
    expect(sends[0]?.options).toMatchObject({
      signal: controller.signal,
      timeoutMs: 5_000,
      maxRetries: 1,
    })
    expect(requests.map((request) => request.path)).toEqual([
      '/v1/content/image-uploads',
      '/v1/content/add-image',
    ])
    for (const request of requests) {
      expect(request.options).toMatchObject({
        signal: controller.signal,
        timeoutMs: 5_000,
        maxRetries: 1,
      })
    }
  })
})
