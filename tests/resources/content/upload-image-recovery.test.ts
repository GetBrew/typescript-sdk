import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  BrewApiError,
  BrewConnectionError,
  BrewParseError,
  BrewTimeoutError,
  BrewTransportError,
} from '../../../src/core/errors'
import { createAddImage } from '../../../src/resources/content/add-image'
import { createUploadImage } from '../../../src/resources/content/upload-image'
import type { ContentAddImageResponse } from '../../../src/resources/content/types'
import { makeTestHttpClient } from '../../helpers/http-client'
import {
  afterHeaders,
  rejectionOf,
  sendJson,
  STALL_TEST,
  startJson,
  useLoopbackServers,
} from '../../helpers/loopback-server'
import { server } from '../../msw/server'

const OPEN_URL = 'https://brew.new/api/v1/content/image-uploads'
const ADD_URL = 'https://brew.new/api/v1/content/add-image'
const UPLOAD_PATH = 'https://uploads.brew.test/recovery-upload'
const UPLOAD_ID = 'imgup_abcdefghijklmnopqrstu'
const UPLOAD_URL = `${UPLOAD_PATH}?uploadId=${UPLOAD_ID}&token=private-token`
const INPUT = {
  file: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
  fileName: 'logo.png',
}
const OPENED = {
  uploadId: UPLOAD_ID,
  uploadUrl: UPLOAD_URL,
  expiresAt: '2026-10-28T12:15:00.000Z',
  maxBytes: 20_000_000,
}
const ADDED = {
  url: 'https://cdn.brew.new/brand-assets/recovered/logo.png',
  width: 16,
  height: 16,
  aspectRatio: '1:1',
  assetId: '1ad27d11',
} satisfies ContentAddImageResponse

function refusal(code: string, status = 409): Response {
  return HttpResponse.json(
    {
      error: {
        code,
        type: 'conflict',
        message: 'The image cannot be added yet.',
        suggestion: 'Retry finalization.',
        docs: 'https://docs.brew.new/api-reference/api/errors',
      },
    },
    { status, headers: { 'x-request-id': 'req_refused' } }
  )
}

function urlOf(input: Parameters<typeof globalThis.fetch>[0]): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

function useFlow({
  openAnswer = () => HttpResponse.json(OPENED, { status: 201 }),
  bytesAnswer = () => HttpResponse.json({ status: 'uploaded' }),
  addAnswer = () =>
    HttpResponse.json(ADDED, {
      headers: { 'x-request-id': 'req_completed' },
    }),
}: {
  openAnswer?: () => Response
  bytesAnswer?: () => Response
  addAnswer?: (attempt: number) => Response
} = {}) {
  const seen: {
    opens: number
    bytes: number
    adds: Array<Request>
  } = { opens: 0, bytes: 0, adds: [] }
  server.use(
    http.post(OPEN_URL, () => {
      seen.opens++
      return openAnswer()
    }),
    http.post(UPLOAD_PATH, () => {
      seen.bytes++
      return bytesAnswer()
    }),
    http.post(ADD_URL, ({ request }) => {
      seen.adds.push(request.clone())
      return addAnswer(seen.adds.length)
    })
  )
  return seen
}

const servers = useLoopbackServers()

describe('content.uploadImage finalization recovery', () => {
  it.each([
    { key: 'explicit', retries: 0 },
    { key: 'generated', retries: 0 },
    { key: 'explicit', retries: 2 },
    { key: 'generated', retries: 2 },
  ])(
    'recovers a lost final answer with a $key key after $retries retries',
    async ({ key, retries }) => {
      const seen = useFlow()
      let lossesRemaining = retries + 1
      const { client } = makeTestHttpClient({
        configOverrides: {
          fetch: async (input, init) => {
            const response = await globalThis.fetch(input, init)
            if (urlOf(input) === ADD_URL && lossesRemaining > 0) {
              lossesRemaining--
              // The server completed the operation. Only its answer is lost.
              expect(await response.json()).toEqual(ADDED)
              throw new TypeError('The successful final answer was lost.')
            }
            return response
          },
        },
      })
      const error = await rejectionOf({
        promise: createUploadImage(client)(INPUT, {
          maxRetries: retries,
          ...(key === 'explicit'
            ? { idempotencyKey: 'original-finalization-key' }
            : {}),
        }),
      })

      expect(error).toBeInstanceOf(BrewConnectionError)
      expect(error).toBeInstanceOf(BrewTransportError)
      if (!(error instanceof BrewTransportError)) {
        throw new Error('Expected the final transport error.')
      }
      expect(error.uploadId).toBe(UPLOAD_ID)
      expectTypeOf(error.uploadId).toEqualTypeOf<string | undefined>()
      expect(error.idempotencyKey).toEqual(expect.any(String))
      expect(error.attempts).toBe(retries + 1)
      if (key === 'explicit') {
        expect(error.idempotencyKey).toBe('original-finalization-key')
      }
      if (error.uploadId === undefined || error.idempotencyKey === undefined) {
        throw new Error('Finalization recovery state was missing.')
      }

      const recovered = await createAddImage(client)(
        { uploadId: error.uploadId },
        { idempotencyKey: error.idempotencyKey, raw: true }
      )

      expect(recovered.data).toEqual(ADDED)
      expect(recovered.requestId).toBe('req_completed')
      expect(recovered.status).toBe(200)
      expect(seen.opens).toBe(1)
      expect(seen.bytes).toBe(1)
      expect(seen.adds).toHaveLength(retries + 2)
      const bodies = await Promise.all(
        seen.adds.map((request) => request.json())
      )
      expect(bodies).toEqual(
        Array.from({ length: retries + 2 }, () => ({ uploadId: UPLOAD_ID }))
      )
      expect(
        seen.adds.every(
          (request) =>
            request.headers.get('idempotency-key') === error.idempotencyKey
        )
      ).toBe(true)
      expect(JSON.stringify(error)).not.toContain('private-token')
    }
  )

  it('retains the original upload and key during a successful in-call retry', async () => {
    const seen = useFlow()
    let wasLost = false
    const { client } = makeTestHttpClient({
      configOverrides: {
        fetch: async (input, init) => {
          const response = await globalThis.fetch(input, init)
          if (urlOf(input) === ADD_URL && !wasLost) {
            wasLost = true
            await response.text()
            throw new TypeError('The first final answer was lost.')
          }
          return response
        },
      },
    })

    const result = await createUploadImage(client)(INPUT, {
      idempotencyKey: 'automatic-retry-key',
      maxRetries: 1,
    })

    expect(result).toEqual(ADDED)
    expect(seen.opens).toBe(1)
    expect(seen.bytes).toBe(1)
    expect(seen.adds).toHaveLength(2)
    expect(
      await Promise.all(seen.adds.map((request) => request.json()))
    ).toEqual([{ uploadId: UPLOAD_ID }, { uploadId: UPLOAD_ID }])
    expect(
      seen.adds.map((request) => request.headers.get('idempotency-key'))
    ).toEqual(['automatic-retry-key', 'automatic-retry-key'])
  })

  it.each([false, true])(
    'preserves final API error fields and recovery state with raw=%s',
    async (raw) => {
      useFlow({ addAnswer: () => refusal('UPLOAD_IN_PROGRESS') })
      const { client } = makeTestHttpClient()
      const error = await rejectionOf({
        promise: createUploadImage(client)(INPUT, {
          raw,
          idempotencyKey: 'api-failure-key',
        }),
      })

      expect(error).toBeInstanceOf(BrewApiError)
      if (!(error instanceof BrewApiError)) {
        throw new Error('Expected the final API error.')
      }
      expect(error.uploadId).toBe(UPLOAD_ID)
      expect(error.idempotencyKey).toBe('api-failure-key')
      expect(error.status).toBe(409)
      expect(error.code).toBe('UPLOAD_IN_PROGRESS')
      expect(error.requestId).toBe('req_refused')
      expect(error.body).toMatchObject({
        error: { code: 'UPLOAD_IN_PROGRESS' },
      })
    }
  )

  it('exposes recovery state when a successful final response is malformed JSON', async () => {
    useFlow({
      addAnswer: () =>
        new HttpResponse('{broken-json', {
          headers: { 'x-request-id': 'req_malformed' },
        }),
    })
    const { client } = makeTestHttpClient()
    const error = await rejectionOf({
      promise: createUploadImage(client)(INPUT, {
        idempotencyKey: 'parse-failure-key',
      }),
    })

    expect(error).toBeInstanceOf(BrewParseError)
    expect(error).not.toBeInstanceOf(BrewTransportError)
    if (!(error instanceof BrewParseError)) {
      throw new Error('Expected the final parse error.')
    }
    expect(error.uploadId).toBe(UPLOAD_ID)
    expect(error.idempotencyKey).toBe('parse-failure-key')
    expect(error.requestId).toBe('req_malformed')
    expect(error.status).toBe(200)
    expect(error.bodyPreview).toBe('{broken-json')
  })

  it('retains recovery state when an unknown outcome is still in progress', async () => {
    const seen = useFlow({
      addAnswer: (attempt) =>
        attempt === 1
          ? HttpResponse.json(ADDED)
          : refusal('IDEMPOTENCY_IN_PROGRESS'),
    })
    let wasLost = false
    const { client } = makeTestHttpClient({
      configOverrides: {
        fetch: async (input, init) => {
          const response = await globalThis.fetch(input, init)
          if (urlOf(input) === ADD_URL && !wasLost) {
            wasLost = true
            await response.text()
            throw new TypeError('The first final answer was lost.')
          }
          return response
        },
      },
    })
    const error = await rejectionOf({
      promise: createUploadImage(client)(INPUT, {
        idempotencyKey: 'in-progress-key',
      }),
    })

    expect(error).toBeInstanceOf(BrewConnectionError)
    if (!(error instanceof BrewTransportError)) {
      throw new Error('Expected the original unknown outcome.')
    }
    expect(error.uploadId).toBe(UPLOAD_ID)
    expect(error.idempotencyKey).toBe('in-progress-key')
    expect(error.inProgress).toBe(true)
    expect(error.attempts).toBe(2)
    expect(seen.opens).toBe(1)
    expect(seen.adds).toHaveLength(2)
  })

  it('preserves a different-body idempotency conflict and its original key', async () => {
    const changedUploadId = 'imgup_a_different_upload'
    const seen = useFlow({
      addAnswer: (attempt) =>
        attempt === 1
          ? HttpResponse.json(ADDED)
          : refusal('IDEMPOTENCY_CONFLICT'),
    })
    const { client } = makeTestHttpClient()
    await createUploadImage(client)(INPUT, {
      idempotencyKey: 'reused-finalization-key',
    })

    const error = await rejectionOf({
      promise: createAddImage(client)(
        { uploadId: changedUploadId },
        { idempotencyKey: 'reused-finalization-key' }
      ),
    })

    expect(error).toBeInstanceOf(BrewApiError)
    if (!(error instanceof BrewApiError)) {
      throw new Error('Expected the different-body conflict.')
    }
    expect(error.status).toBe(409)
    expect(error.code).toBe('IDEMPOTENCY_CONFLICT')
    expect(error.uploadId).toBe(changedUploadId)
    expect(error.idempotencyKey).toBe('reused-finalization-key')
    expect(seen.adds).toHaveLength(2)
    expect(
      await Promise.all(seen.adds.map((request) => request.json()))
    ).toEqual([{ uploadId: UPLOAD_ID }, { uploadId: changedUploadId }])
    expect(
      seen.adds.map((request) => request.headers.get('idempotency-key'))
    ).toEqual(['reused-finalization-key', 'reused-finalization-key'])
  })

  it.each(['timeout', 'connection'] as const)(
    'exposes recovery state after a final response body %s failure',
    STALL_TEST,
    async (kind) => {
      const observed = afterHeaders()
      const { baseUrl } = await servers.start({
        route: ({ req, res, later }) => {
          if (req.url?.endsWith('/content/image-uploads')) {
            sendJson({ res, status: 201, body: OPENED })
            return
          }
          startJson({ res, status: 200, partial: '{"url":' })
          if (kind === 'connection') {
            later({ ms: 80, fn: () => res.destroy() })
          }
        },
      })
      server.use(
        http.post(UPLOAD_PATH, () => HttpResponse.json({ status: 'uploaded' }))
      )
      const { client } = makeTestHttpClient({
        configOverrides: {
          baseUrl,
          fetch: (input, init) =>
            urlOf(input).endsWith('/content/add-image')
              ? observed.fetch(input, init)
              : globalThis.fetch(input, init),
        },
      })
      const error = await rejectionOf({
        promise: createUploadImage(client)(INPUT, {
          maxRetries: 0,
          timeoutMs: kind === 'timeout' ? 400 : 1000,
          idempotencyKey: 'body-failure-key',
        }),
      })

      expect(observed.wereHeadersReceived()).toBe(true)
      expect(error).toBeInstanceOf(
        kind === 'timeout' ? BrewTimeoutError : BrewConnectionError
      )
      if (!(error instanceof BrewTransportError)) {
        throw new Error('Expected the final body transport error.')
      }
      expect(error.uploadId).toBe(UPLOAD_ID)
      expect(error.idempotencyKey).toBe('body-failure-key')
      expect(error.attempts).toBe(1)
    }
  )

  it.each(['open', 'bytes'] as const)(
    'does not advertise finalization recovery after a %s failure',
    async (stage) => {
      const seen = useFlow({
        ...(stage === 'open'
          ? { openAnswer: () => refusal('INVALID_REQUEST', 400) }
          : { bytesAnswer: () => refusal('INVALID_REQUEST', 400) }),
      })
      const { client } = makeTestHttpClient()
      const error = await rejectionOf({
        promise: createUploadImage(client)(INPUT),
      })

      expect(error).toBeInstanceOf(BrewApiError)
      if (!(error instanceof BrewApiError)) {
        throw new Error('Expected an earlier API failure.')
      }
      expect(error.uploadId).toBeUndefined()
      expect(error.idempotencyKey).toBeUndefined()
      expect(seen.adds).toHaveLength(0)
      expect(JSON.stringify(error)).not.toContain('private-token')
    }
  )

  it('leaves URL-based addImage failures without upload recovery metadata', async () => {
    useFlow({ addAnswer: () => refusal('CONTENT_OPERATION_FAILED', 422) })
    const { client } = makeTestHttpClient()
    const error = await rejectionOf({
      promise: createAddImage(client)({
        imageUrl: 'https://images.test/logo.png',
      }),
    })

    expect(error).toBeInstanceOf(BrewApiError)
    if (!(error instanceof BrewApiError)) {
      throw new Error('Expected the URL import error.')
    }
    expect(error.uploadId).toBeUndefined()
  })

  it('retains the replay key on unrelated parse errors without an upload ID', async () => {
    useFlow({ addAnswer: () => new HttpResponse('not-json') })
    const { client } = makeTestHttpClient()
    const error = await rejectionOf({
      promise: createAddImage(client)(
        { imageUrl: 'https://images.test/logo.png' },
        { idempotencyKey: 'url-import-key' }
      ),
    })

    expect(error).toBeInstanceOf(BrewParseError)
    if (!(error instanceof BrewParseError)) {
      throw new Error('Expected the URL import parse error.')
    }
    expect(error.idempotencyKey).toBe('url-import-key')
    expect(error.uploadId).toBeUndefined()
  })

  it.each(['request', 'client'] as const)(
    'preserves an SDK error used as the %s abort reason without enriching it',
    async (scope) => {
      useFlow()
      const controller = new AbortController()
      const reason = new BrewConnectionError({
        method: 'POST',
        url: 'https://other.test/original-request',
        attempts: 1,
        idempotencyKey: 'unrelated-key',
      })
      Object.freeze(reason)
      const originalKeys = Object.keys(reason)
      const { client } = makeTestHttpClient({
        configOverrides: {
          ...(scope === 'client' ? { signal: controller.signal } : {}),
          fetch: async (input, init) => {
            const response = await globalThis.fetch(input, init)
            if (urlOf(input) === ADD_URL) {
              await response.text()
              controller.abort(reason)
              throw reason
            }
            return response
          },
        },
      })
      const error = await rejectionOf({
        promise: createUploadImage(client)(INPUT, {
          ...(scope === 'request' ? { signal: controller.signal } : {}),
        }),
      })

      expect(error).toBe(reason)
      expect(Object.keys(reason)).toEqual(originalKeys)
      expect(reason.uploadId).toBeUndefined()
      expect(reason.idempotencyKey).toBe('unrelated-key')
    }
  )
})
