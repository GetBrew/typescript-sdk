import { http, HttpResponse, delay } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { resolveConfig } from '../../src/core/config'
import { BrewApiError } from '../../src/core/errors'
import { createHttpClient, type HttpTuning } from '../../src/core/http'
import type { BrewClientConfig } from '../../src/types'
import { server } from '../msw/server'

/**
 * Test harness: builds an http client with fast/deterministic retry tuning
 * and records every sleep duration so tests can assert on Retry-After
 * behavior without actually waiting.
 */
function makeTestClient({
  configOverrides = {},
  tuningOverrides = {},
}: {
  configOverrides?: Partial<BrewClientConfig>
  tuningOverrides?: HttpTuning
} = {}): {
  client: ReturnType<typeof createHttpClient>
  sleepCalls: Array<number>
} {
  const config = resolveConfig({
    userConfig: {
      apiKey: 'brew_test_abc',
      baseUrl: 'https://brew.new/api',
      maxRetries: 2,
      ...configOverrides,
    },
  })
  const sleepCalls: Array<number> = []
  const client = createHttpClient(config, {
    retryBaseMs: 1,
    retryMaxMs: 1,
    random: () => 0,
    sleep: (ms: number): Promise<void> => {
      sleepCalls.push(ms)
      return Promise.resolve()
    },
    ...tuningOverrides,
  })
  return { client, sleepCalls }
}

describe('http.request', () => {
  let capturedRequest: Request | undefined

  beforeEach(() => {
    capturedRequest = undefined
  })

  describe('URL and method composition', () => {
    it('sends the right URL with query params', async () => {
      server.use(
        http.get('https://brew.new/api/v1/contacts', ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({ contacts: [] })
        })
      )

      const { client } = makeTestClient()
      await client.request({
        method: 'GET',
        path: '/v1/contacts',
        query: { limit: 25, email: 'jane@example.com' },
      })

      expect(capturedRequest).toBeDefined()
      const url = new URL(capturedRequest!.url)
      expect(url.origin + url.pathname).toBe('https://brew.new/api/v1/contacts')
      expect(url.searchParams.get('limit')).toBe('25')
      expect(url.searchParams.get('email')).toBe('jane@example.com')
    })

    it('sends the correct HTTP method', async () => {
      server.use(
        http.delete('https://brew.new/api/v1/contacts', ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({ deleted: 1 })
        })
      )

      const { client } = makeTestClient()
      await client.request({ method: 'DELETE', path: '/v1/contacts' })

      expect(capturedRequest?.method).toBe('DELETE')
    })
  })

  describe('headers', () => {
    it('sends Authorization: Bearer <apiKey>, Accept, and User-Agent', async () => {
      server.use(
        http.get('https://brew.new/api/v1/contacts', ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({ contacts: [] })
        })
      )

      const { client } = makeTestClient()
      await client.request({ method: 'GET', path: '/v1/contacts' })

      expect(capturedRequest?.headers.get('authorization')).toBe(
        'Bearer brew_test_abc'
      )
      expect(capturedRequest?.headers.get('accept')).toBe('application/json')
      expect(capturedRequest?.headers.get('user-agent')).toMatch(
        /^brew-typescript-sdk\//
      )
    })

    it('does NOT send Content-Type on a GET request without a body', async () => {
      server.use(
        http.get('https://brew.new/api/v1/contacts', ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({ contacts: [] })
        })
      )

      const { client } = makeTestClient()
      await client.request({ method: 'GET', path: '/v1/contacts' })

      expect(capturedRequest?.headers.get('content-type')).toBeNull()
    })
  })

  describe('body serialization', () => {
    it('serializes POST body as JSON and sets Content-Type', async () => {
      server.use(
        http.post('https://brew.new/api/v1/contacts', async ({ request }) => {
          capturedRequest = request.clone()
          const body = (await request.json()) as unknown
          return HttpResponse.json({ echoed: body }, { status: 201 })
        })
      )

      const { client } = makeTestClient()
      const result = await client.request<{ echoed: unknown }>({
        method: 'POST',
        path: '/v1/contacts',
        body: { email: 'jane@example.com', firstName: 'Jane' },
      })

      expect(capturedRequest?.headers.get('content-type')).toBe(
        'application/json'
      )
      expect(result.data.echoed).toEqual({
        email: 'jane@example.com',
        firstName: 'Jane',
      })
    })
  })

  describe('success path', () => {
    it('returns data + status + headers + requestId on 2xx', async () => {
      server.use(
        http.get('https://brew.new/api/v1/contacts/abc', () => {
          return HttpResponse.json(
            { email: 'jane@example.com' },
            {
              status: 200,
              headers: { 'x-request-id': 'req_success_1' },
            }
          )
        })
      )

      const { client } = makeTestClient()
      const result = await client.request<{ email: string }>({
        method: 'GET',
        path: '/v1/contacts/abc',
      })

      expect(result.data).toEqual({ email: 'jane@example.com' })
      expect(result.status).toBe(200)
      expect(result.requestId).toBe('req_success_1')
      expect(result.headers.get('x-request-id')).toBe('req_success_1')
    })
  })

  describe('error mapping', () => {
    it('throws BrewApiError on 404 with the envelope mapped', async () => {
      server.use(
        http.get('https://brew.new/api/v1/contacts/missing', () => {
          return HttpResponse.json(
            {
              code: 'contact_not_found',
              type: 'not_found',
              message: 'Contact does not exist',
            },
            {
              status: 404,
              headers: { 'x-request-id': 'req_not_found' },
            }
          )
        })
      )

      const { client } = makeTestClient()

      await expect(
        client.request({ method: 'GET', path: '/v1/contacts/missing' })
      ).rejects.toMatchObject({
        name: 'BrewApiError',
        status: 404,
        code: 'contact_not_found',
        type: 'not_found',
        message: 'Contact does not exist',
        requestId: 'req_not_found',
      })
    })

    it('throws BrewApiError on 500 with requestId preserved from headers', async () => {
      server.use(
        http.get('https://brew.new/api/v1/contacts', () => {
          return HttpResponse.json(
            {
              code: 'internal_error',
              type: 'server_error',
              message: 'boom',
            },
            {
              status: 500,
              headers: { 'x-request-id': 'req_boom' },
            }
          )
        })
      )

      const { client } = makeTestClient({
        configOverrides: { maxRetries: 0 },
      })

      try {
        await client.request({ method: 'GET', path: '/v1/contacts' })
        expect.fail('expected BrewApiError to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BrewApiError)
        const asError = error as BrewApiError
        expect(asError.status).toBe(500)
        expect(asError.requestId).toBe('req_boom')
      }
    })
  })

  describe('retry behavior', () => {
    it('retries 503 twice then succeeds on the third attempt', async () => {
      let callCount = 0
      server.use(
        http.get('https://brew.new/api/v1/contacts', () => {
          callCount++
          if (callCount < 3) {
            return new HttpResponse(null, { status: 503 })
          }
          return HttpResponse.json({ contacts: [] })
        })
      )

      const { client } = makeTestClient({
        configOverrides: { maxRetries: 2 },
      })
      const result = await client.request<{ contacts: Array<unknown> }>({
        method: 'GET',
        path: '/v1/contacts',
      })

      expect(callCount).toBe(3)
      expect(result.data).toEqual({ contacts: [] })
    })

    it('does NOT retry a 400 (bad request)', async () => {
      let callCount = 0
      server.use(
        http.get('https://brew.new/api/v1/contacts', () => {
          callCount++
          return HttpResponse.json(
            {
              code: 'validation_failed',
              type: 'invalid_request',
              message: 'bad email',
            },
            { status: 400 }
          )
        })
      )

      const { client } = makeTestClient({
        configOverrides: { maxRetries: 5 },
      })

      await expect(
        client.request({ method: 'GET', path: '/v1/contacts' })
      ).rejects.toBeInstanceOf(BrewApiError)

      expect(callCount).toBe(1)
    })

    it('does NOT retry POST 500 without an idempotency key (auto-gen is key-attached, but resolve gives one for POST — so this tests a PATCH instead)', async () => {
      let callCount = 0
      server.use(
        http.patch('https://brew.new/api/v1/contacts', () => {
          callCount++
          return HttpResponse.json(
            {
              code: 'internal_error',
              type: 'server_error',
              message: 'boom',
            },
            { status: 500 }
          )
        })
      )

      const { client } = makeTestClient({
        configOverrides: { maxRetries: 3 },
      })

      await expect(
        client.request({
          method: 'PATCH',
          path: '/v1/contacts',
          body: { email: 'jane@example.com' },
        })
      ).rejects.toBeInstanceOf(BrewApiError)

      expect(callCount).toBe(1)
    })

    it('DOES retry POST 500 because POST auto-generates an idempotency key', async () => {
      let callCount = 0
      server.use(
        http.post('https://brew.new/api/v1/contacts', () => {
          callCount++
          if (callCount < 2) {
            return new HttpResponse(null, { status: 500 })
          }
          return HttpResponse.json({ ok: true }, { status: 201 })
        })
      )

      const { client } = makeTestClient({
        configOverrides: { maxRetries: 2 },
      })
      const result = await client.request<{ ok: boolean }>({
        method: 'POST',
        path: '/v1/contacts',
        body: { email: 'jane@example.com' },
      })

      expect(callCount).toBe(2)
      expect(result.data.ok).toBe(true)
    })

    it('stops retrying once maxRetries is exhausted and throws the last error', async () => {
      let callCount = 0
      server.use(
        http.get('https://brew.new/api/v1/contacts', () => {
          callCount++
          return new HttpResponse(null, { status: 503 })
        })
      )

      const { client } = makeTestClient({
        configOverrides: { maxRetries: 2 },
      })

      await expect(
        client.request({ method: 'GET', path: '/v1/contacts' })
      ).rejects.toBeInstanceOf(BrewApiError)

      // 1 initial attempt + 2 retries = 3 total calls.
      expect(callCount).toBe(3)
    })

    it('honors Retry-After on 429 by passing (seconds * 1000) to sleep', async () => {
      let callCount = 0
      server.use(
        http.get('https://brew.new/api/v1/contacts', () => {
          callCount++
          if (callCount < 2) {
            return new HttpResponse(null, {
              status: 429,
              headers: { 'retry-after': '2' },
            })
          }
          return HttpResponse.json({ contacts: [] })
        })
      )

      const { client, sleepCalls } = makeTestClient({
        configOverrides: { maxRetries: 2 },
      })

      await client.request({ method: 'GET', path: '/v1/contacts' })

      expect(callCount).toBe(2)
      expect(sleepCalls).toEqual([2000])
    })
  })

  describe('idempotency key propagation', () => {
    it('auto-generates an Idempotency-Key header on POST', async () => {
      server.use(
        http.post('https://brew.new/api/v1/contacts', ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({ ok: true }, { status: 201 })
        })
      )

      const { client } = makeTestClient()
      await client.request({
        method: 'POST',
        path: '/v1/contacts',
        body: { email: 'jane@example.com' },
      })

      const headerValue = capturedRequest?.headers.get('idempotency-key')
      expect(headerValue).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      )
    })

    it('uses a caller-provided Idempotency-Key verbatim on POST', async () => {
      server.use(
        http.post('https://brew.new/api/v1/contacts', ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({ ok: true }, { status: 201 })
        })
      )

      const { client } = makeTestClient()
      await client.request({
        method: 'POST',
        path: '/v1/contacts',
        body: { email: 'jane@example.com' },
        options: { idempotencyKey: 'idem_caller_xyz' },
      })

      expect(capturedRequest?.headers.get('idempotency-key')).toBe(
        'idem_caller_xyz'
      )
    })

    it('does NOT send Idempotency-Key on GET even when one is passed', async () => {
      server.use(
        http.get('https://brew.new/api/v1/contacts', ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({ contacts: [] })
        })
      )

      const { client } = makeTestClient()
      await client.request({
        method: 'GET',
        path: '/v1/contacts',
        options: { idempotencyKey: 'idem_should_be_ignored' },
      })

      expect(capturedRequest?.headers.get('idempotency-key')).toBeNull()
    })
  })

  describe('custom fetch injection', () => {
    it('uses the fetch passed in config instead of global fetch', async () => {
      let wasCalled = false
      const customFetch: typeof globalThis.fetch = (...args) => {
        wasCalled = true
        return globalThis.fetch(...args)
      }

      server.use(
        http.get('https://brew.new/api/v1/contacts', () => {
          return HttpResponse.json({ contacts: [] })
        })
      )

      const { client } = makeTestClient({
        configOverrides: { fetch: customFetch },
      })
      await client.request({ method: 'GET', path: '/v1/contacts' })

      expect(wasCalled).toBe(true)
    })
  })

  describe('abort / signal handling', () => {
    it('propagates a caller-initiated abort by rejecting the request', async () => {
      server.use(
        http.get('https://brew.new/api/v1/contacts', async () => {
          await delay(500)
          return HttpResponse.json({ contacts: [] })
        })
      )

      const abortController = new AbortController()
      const { client } = makeTestClient()

      const pending = client.request({
        method: 'GET',
        path: '/v1/contacts',
        options: { signal: abortController.signal },
      })

      abortController.abort()

      await expect(pending).rejects.toThrow()
    })
  })
})
