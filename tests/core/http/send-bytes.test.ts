import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  BrewApiError,
  BrewConnectionError,
  BrewTimeoutError,
} from '../../../src/core/errors'
import { makeTestHttpClient } from '../../helpers/http-client'
import {
  afterHeaders,
  elapsedSince,
  rejectionOf,
  sendJson,
  silentRoute,
  STALL_TEST,
  stallingBodyRoute,
  useLoopbackServers,
} from '../../helpers/loopback-server'
import { server } from '../../msw/server'

/**
 * `sendBytes` POSTs raw bytes to a URL the API handed back that carries its
 * own credential (an image upload's `uploadUrl`). It is the same transport
 * as `request` — the client's `fetch`, deadline, cancellation and retry
 * loop — minus the client's credentials: the URL is the credential, so the
 * API key must never travel to it.
 */

const UPLOAD_ORIGIN = 'https://uploads.brew.test'
const UPLOAD_PATH = `${UPLOAD_ORIGIN}/brand-image-upload`
const UPLOAD_URL = `${UPLOAD_PATH}?uploadId=imgup_abcdefghijklmnopqrstu&token=s3cr3t-upload-token`

const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

const RECEIPT = {
  uploadId: 'imgup_abcdefghijklmnopqrstu',
  status: 'uploaded',
  size: PNG_BYTES.byteLength,
  expiresAt: '2026-10-02T12:15:00.000Z',
  next: 'Call add_image with this uploadId.',
}

function pngBlob(): Blob {
  return new Blob([PNG_BYTES])
}

/** The URL a `fetch` call names (the SDK always passes a string). */
function urlOf(input: Parameters<typeof globalThis.fetch>[0]): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

const servers = useLoopbackServers()

describe('http.sendBytes', () => {
  it('POSTs the bytes to the absolute URL without the client credentials', async () => {
    let captured: Request | undefined
    server.use(
      http.post(UPLOAD_PATH, ({ request }) => {
        captured = request.clone()
        return HttpResponse.json(RECEIPT)
      })
    )
    // A pinned brand and an API key: neither may reach the upload URL.
    const { client } = makeTestHttpClient({
      configOverrides: { brandId: 'brand_123' },
    })

    const response = await client.sendBytes<typeof RECEIPT>({
      url: UPLOAD_URL,
      bytes: pngBlob(),
      contentType: 'image/png',
    })

    expect(captured?.method).toBe('POST')
    // Sent to the URL as given, query (its credential) included.
    expect(captured?.url).toBe(UPLOAD_URL)
    expect(captured?.headers.get('authorization')).toBeNull()
    expect(captured?.headers.get('x-api-key')).toBeNull()
    expect(captured?.headers.get('x-brand-id')).toBeNull()
    expect(captured?.headers.get('idempotency-key')).toBeNull()
    expect(captured?.headers.get('content-type')).toBe('image/png')
    expect(captured?.headers.get('accept')).toBe('application/json')
    expect(captured?.headers.get('user-agent')).toMatch(/^brew\.new-sdk\//)
    expect(new Uint8Array(await captured!.arrayBuffer())).toEqual(PNG_BYTES)
    expect(response.status).toBe(200)
    expect(response.data).toEqual(RECEIPT)
  })

  it("goes through the client's configured fetch", async () => {
    server.use(http.post(UPLOAD_PATH, () => HttpResponse.json(RECEIPT)))
    const seen: Array<string> = []
    const { client } = makeTestHttpClient({
      configOverrides: {
        fetch: (input, init) => {
          seen.push(`${init?.method ?? 'GET'} ${urlOf(input)}`)
          return globalThis.fetch(input, init)
        },
      },
    })

    await client.sendBytes({
      url: UPLOAD_URL,
      bytes: pngBlob(),
      contentType: 'image/png',
    })

    expect(seen).toEqual([`POST ${UPLOAD_URL}`])
  })

  it.each([
    { status: 404, code: 'UPLOAD_NOT_FOUND', type: 'not_found' },
    { status: 413, code: 'PAYLOAD_TOO_LARGE', type: 'invalid_request' },
    { status: 400, code: 'INVALID_REQUEST', type: 'invalid_request' },
  ])(
    'maps a $status { error: { code: $code } } answer to a BrewApiError, never retried',
    async ({ status, code, type }) => {
      let calls = 0
      server.use(
        http.post(UPLOAD_PATH, () => {
          calls++
          return HttpResponse.json(
            { error: { code, message: `Refused: ${code}.` } },
            { status }
          )
        })
      )
      const { client } = makeTestHttpClient()

      const error = await rejectionOf({
        promise: client.sendBytes({
          url: UPLOAD_URL,
          bytes: pngBlob(),
          contentType: 'image/png',
        }),
      })

      expect(error).toBeInstanceOf(BrewApiError)
      const apiError = error as BrewApiError
      expect(apiError.status).toBe(status)
      expect(apiError.code).toBe(code)
      expect(apiError.type).toBe(type)
      expect(apiError.message).toBe(`Refused: ${code}.`)
      expect(apiError.idempotencyKey).toBeUndefined()
      expect(calls).toBe(1)
    }
  )

  it('retries a dropped connection and a 503, sending the same bytes each time', async () => {
    const bodies: Array<Uint8Array> = []
    server.use(
      http.post(UPLOAD_PATH, async ({ request }) => {
        bodies.push(new Uint8Array(await request.arrayBuffer()))
        if (bodies.length === 1) return HttpResponse.error()
        if (bodies.length === 2) {
          return HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Try again.' } },
            { status: 503 }
          )
        }
        return HttpResponse.json(RECEIPT)
      })
    )
    const { client } = makeTestHttpClient({
      configOverrides: { maxRetries: 2 },
    })

    const response = await client.sendBytes({
      url: UPLOAD_URL,
      bytes: pngBlob(),
      contentType: 'image/png',
    })

    // A repeat POST is safe: the URL names the one upload it fills, and the
    // server keeps the first file it receives.
    expect(bodies).toEqual([PNG_BYTES, PNG_BYTES, PNG_BYTES])
    expect(response.data).toEqual(RECEIPT)
  })

  it('leaves the credential-bearing query out of a transport error', async () => {
    server.use(http.post(UPLOAD_PATH, () => HttpResponse.error()))
    const { client } = makeTestHttpClient({
      configOverrides: { maxRetries: 0 },
    })

    const error = await rejectionOf({
      promise: client.sendBytes({
        url: UPLOAD_URL,
        bytes: pngBlob(),
        contentType: 'image/png',
      }),
    })

    expect(error).toBeInstanceOf(BrewConnectionError)
    const connection = error as BrewConnectionError
    expect(connection.method).toBe('POST')
    expect(connection.url).toBe(UPLOAD_PATH)
    expect(connection.idempotencyKey).toBeUndefined()
    expect(connection.message).not.toContain('s3cr3t')
  })

  it(
    'rejects with the caller signal reason while the upload waits for an answer',
    STALL_TEST,
    async () => {
      const { baseUrl, requests } = await servers.start({ route: silentRoute })
      const origin = new URL(baseUrl).origin
      const { client } = makeTestHttpClient()
      const controller = new AbortController()
      setTimeout(() => {
        controller.abort()
      }, 50)

      const error = await rejectionOf({
        promise: client.sendBytes({
          url: `${origin}/upload?token=t`,
          bytes: pngBlob(),
          contentType: 'image/png',
          options: { signal: controller.signal },
        }),
      })

      expect(error).toBe(controller.signal.reason)
      expect(requests.length).toBeLessThanOrEqual(1)
    }
  )

  it('bounds the answer body with the deadline too', STALL_TEST, async () => {
    const { baseUrl, requests } = await servers.start({
      route: stallingBodyRoute,
    })
    const origin = new URL(baseUrl).origin
    const tracked = afterHeaders()
    const { client } = makeTestHttpClient({
      configOverrides: { fetch: tracked.fetch },
    })
    const started = performance.now()

    const error = await rejectionOf({
      promise: client.sendBytes({
        url: `${origin}/upload?token=t`,
        bytes: pngBlob(),
        contentType: 'image/png',
        options: { timeoutMs: 400, retryOnTimeout: false },
      }),
    })

    expect(tracked.wereHeadersReceived()).toBe(true)
    expect(error).toBeInstanceOf(BrewTimeoutError)
    expect((error as BrewTimeoutError).timeoutMs).toBe(400)
    expect((error as BrewTimeoutError).url).toBe(`${origin}/upload`)
    expect(elapsedSince({ started })).toBeLessThan(2000)
    expect(requests).toHaveLength(1)
  })

  it(
    'treats defaultTimeoutMs as a floor over a shorter client timeout',
    STALL_TEST,
    async () => {
      const { baseUrl } = await servers.start({
        route: ({ res, later }) => {
          later({
            ms: 150,
            fn: () => {
              sendJson({ res, status: 200, body: RECEIPT })
            },
          })
        },
      })
      const origin = new URL(baseUrl).origin
      const { client } = makeTestHttpClient({
        configOverrides: { timeoutMs: 20, maxRetries: 0 },
      })

      const response = await client.sendBytes({
        url: `${origin}/upload?token=t`,
        bytes: pngBlob(),
        contentType: 'image/png',
        defaultTimeoutMs: 3000,
      })

      expect(response.data).toEqual(RECEIPT)
    }
  )
})
