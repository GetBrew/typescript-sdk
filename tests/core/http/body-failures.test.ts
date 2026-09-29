import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'

import {
  BrewApiError,
  BrewConnectionError,
  BrewParseError,
  BrewTransportError,
} from '../../../src/core/errors'
import { makeTestHttpClient } from '../../helpers/http-client'
import {
  type Loopback,
  rejectionOf,
  sendJson,
  startJson,
  startLoopback,
} from '../../helpers/loopback-server'
import { server } from '../../msw/server'

/**
 * What happens when the response body itself goes wrong: the connection
 * drops after the headers, the error envelope is cut off, or a 2xx body is
 * not JSON. Before this suite a mid-body drop on a 2xx escaped the retry loop
 * as a raw `TypeError` (never retried, even with `maxRetries: 2`), a truncated
 * error envelope silently became `unknown_error`, and a malformed 2xx threw a
 * bare `SyntaxError`.
 */

const BODY_TEST = { timeout: 4000 }
const CONTACTS = { contacts: [{ email: 'jane@example.com' }] }

let loopback: Loopback | undefined

afterEach(async () => {
  await loopback?.close()
  loopback = undefined
})

/** Drop the connection after writing the headers and part of the body. */
async function droppingServer({
  status = 200,
  dropUntilAttempt = Number.POSITIVE_INFINITY,
}: {
  status?: number
  dropUntilAttempt?: number
} = {}): Promise<Loopback> {
  loopback = await startLoopback({
    route: ({ res, attempt, later }) => {
      if (attempt > dropUntilAttempt) {
        sendJson({ res, status: 200, body: CONTACTS })
        return
      }
      startJson({ res, status, partial: '{"contacts":[{"email":"ja' })
      later({
        ms: 20,
        fn: () => {
          res.socket?.destroy()
        },
      })
    },
  })
  return loopback
}

describe('http.request — the connection drops mid-body', () => {
  it(
    'retries a GET whose body broke, and returns the next attempt',
    BODY_TEST,
    async () => {
      const { baseUrl, requests } = await droppingServer({
        dropUntilAttempt: 1,
      })
      const { client } = makeTestHttpClient({
        configOverrides: { baseUrl, maxRetries: 2 },
      })

      const result = await client.request<typeof CONTACTS>({
        method: 'GET',
        path: '/v1/contacts',
      })

      expect(result.data).toEqual(CONTACTS)
      expect(requests).toHaveLength(2)
    }
  )

  it(
    'retries a POST whose body broke with the SAME idempotency key',
    BODY_TEST,
    async () => {
      const { baseUrl, requests } = await droppingServer({
        dropUntilAttempt: 1,
      })
      const { client } = makeTestHttpClient({
        configOverrides: { baseUrl, maxRetries: 2 },
      })

      await client.request({
        method: 'POST',
        path: '/v1/contacts',
        body: { email: 'jane@example.com' },
      })

      expect(requests).toHaveLength(2)
      expect(requests[0]?.idempotencyKey).toEqual(expect.any(String))
      expect(requests[1]?.idempotencyKey).toBe(requests[0]?.idempotencyKey)
    }
  )

  it(
    'throws BrewConnectionError once every attempt broke',
    BODY_TEST,
    async () => {
      const { baseUrl, requests } = await droppingServer()
      const { client } = makeTestHttpClient({
        configOverrides: { baseUrl, maxRetries: 2 },
      })

      const error = await rejectionOf({
        promise: client.request({ method: 'GET', path: '/v1/contacts' }),
      })

      expect(error).toBeInstanceOf(BrewConnectionError)
      expect(error).toBeInstanceOf(BrewTransportError)
      // A transport failure has no HTTP answer, so it must stay out of the
      // `BrewApiError` branch the public docs route API errors through.
      expect(error).not.toBeInstanceOf(BrewApiError)
      const connection = error as BrewConnectionError
      expect(connection.attempts).toBe(3)
      expect(connection.cause).toBeInstanceOf(Error)
      expect(requests).toHaveLength(3)
    }
  )

  it('keeps the method policy: a PATCH is not retried', BODY_TEST, async () => {
    const { baseUrl, requests } = await droppingServer()
    const { client } = makeTestHttpClient({
      configOverrides: { baseUrl, maxRetries: 2 },
    })

    const error = await rejectionOf({
      promise: client.request({
        method: 'PATCH',
        path: '/v1/contacts',
        body: { email: 'jane@example.com' },
      }),
    })

    expect(error).toBeInstanceOf(BrewConnectionError)
    expect((error as BrewConnectionError).attempts).toBe(1)
    expect(requests).toHaveLength(1)
  })

  it(
    'names the idempotency key on a POST that never completed',
    BODY_TEST,
    async () => {
      const { baseUrl, requests } = await droppingServer()
      const { client } = makeTestHttpClient({
        configOverrides: { baseUrl, maxRetries: 0 },
      })

      const error = await rejectionOf({
        promise: client.request({
          method: 'POST',
          path: '/v1/contacts',
          body: { email: 'jane@example.com' },
        }),
      })

      expect((error as BrewConnectionError).idempotencyKey).toBe(
        requests[0]?.idempotencyKey
      )
    }
  )
})

describe('http.request — the error envelope is cut off', () => {
  it(
    'still throws the BrewApiError for the status, and says the body was truncated',
    BODY_TEST,
    async () => {
      const { baseUrl } = await droppingServer({ status: 502 })
      const { client } = makeTestHttpClient({
        configOverrides: { baseUrl, maxRetries: 0 },
      })

      const error = await rejectionOf({
        promise: client.request({ method: 'GET', path: '/v1/contacts' }),
      })

      expect(error).toBeInstanceOf(BrewApiError)
      const api = error as BrewApiError
      expect(api.status).toBe(502)
      expect(api.code).toBe('unknown_error')
      expect(api.bodyError).toBeInstanceOf(Error)
      expect(api.message).toMatch(/truncated/i)
    }
  )

  it('bounds a stalled error body by timeoutMs', BODY_TEST, async () => {
    loopback = await startLoopback({
      route: ({ res }) => {
        startJson({
          res,
          status: 400,
          partial:
            '{"error":{"code":"INVALID_REQUEST","type":"invalid_request",',
        })
      },
    })
    const { client } = makeTestHttpClient({
      configOverrides: {
        baseUrl: loopback.baseUrl,
        timeoutMs: 400,
        maxRetries: 0,
      },
    })
    const started = performance.now()

    const error = await rejectionOf({
      promise: client.request({ method: 'GET', path: '/v1/contacts' }),
    })

    // The status is the news: a 400 is a 400 even if its envelope never
    // finished arriving. The deadline shows up as the reason it is partial.
    expect(error).toBeInstanceOf(BrewApiError)
    expect((error as BrewApiError).status).toBe(400)
    expect((error as BrewApiError).bodyError).toBeInstanceOf(Error)
    expect(performance.now() - started).toBeLessThan(2000)
  })

  it('does not mark a complete non-JSON error body as truncated', async () => {
    server.use(
      http.get(
        'https://brew.new/api/v1/contacts',
        () =>
          new HttpResponse('<html>Bad Gateway</html>', {
            status: 502,
            headers: { 'content-type': 'text/html' },
          })
      )
    )
    const { client } = makeTestHttpClient({
      configOverrides: { maxRetries: 0 },
    })

    const error = await rejectionOf({
      promise: client.request({ method: 'GET', path: '/v1/contacts' }),
    })

    expect(error).toBeInstanceOf(BrewApiError)
    expect((error as BrewApiError).code).toBe('unknown_error')
    expect((error as BrewApiError).bodyError).toBeUndefined()
  })
})

describe('http.request — a 2xx body that is not JSON', () => {
  it('throws BrewParseError and does not retry', async () => {
    let calls = 0
    server.use(
      http.get('https://brew.new/api/v1/contacts', () => {
        calls++
        return new HttpResponse('{"contacts":[', {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'x-request-id': 'req_bad_json',
          },
        })
      })
    )
    const { client } = makeTestHttpClient({
      configOverrides: { maxRetries: 3 },
    })

    const error = await rejectionOf({
      promise: client.request({ method: 'GET', path: '/v1/contacts' }),
    })

    expect(error).toBeInstanceOf(BrewParseError)
    // The request DID reach the server and got a 200 — this is not a
    // transport failure, and retrying would return the same bytes.
    expect(error).not.toBeInstanceOf(BrewTransportError)
    expect(error).not.toBeInstanceOf(BrewApiError)
    const parse = error as BrewParseError
    expect(parse.status).toBe(200)
    expect(parse.requestId).toBe('req_bad_json')
    expect(parse.bodyPreview).toBe('{"contacts":[')
    expect(parse.cause).toBeInstanceOf(SyntaxError)
    expect(calls).toBe(1)
  })

  it('still returns undefined data for an empty 2xx body', async () => {
    server.use(
      http.delete(
        'https://brew.new/api/v1/contacts',
        () => new HttpResponse(null, { status: 204 })
      )
    )
    const { client } = makeTestHttpClient()

    const result = await client.request({
      method: 'DELETE',
      path: '/v1/contacts',
    })

    expect(result.status).toBe(204)
    expect(result.data).toBeUndefined()
  })

  it('decodes a multi-byte body split across chunks', BODY_TEST, async () => {
    // "é" is two bytes in UTF-8; split them across two writes so a decoder
    // that does not stream would corrupt the character.
    const bytes = Buffer.from(JSON.stringify({ name: 'Zoë Ångström' }))
    const splitAt = bytes.indexOf(0xc3) + 1
    loopback = await startLoopback({
      route: ({ res, later }) => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.write(bytes.subarray(0, splitAt))
        later({
          ms: 10,
          fn: () => {
            res.end(bytes.subarray(splitAt))
          },
        })
      },
    })
    const { client } = makeTestHttpClient({
      configOverrides: { baseUrl: loopback.baseUrl },
    })

    const result = await client.request<{ name: string }>({
      method: 'GET',
      path: '/v1/contacts',
    })

    expect(result.data.name).toBe('Zoë Ångström')
  })
})
