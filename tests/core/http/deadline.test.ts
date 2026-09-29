import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createBrewClient } from '../../../src/client'
import {
  BrewApiError,
  BrewTimeoutError,
  BrewTransportError,
} from '../../../src/core/errors'
import { makeTestHttpClient } from '../../helpers/http-client'
import {
  afterHeaders,
  elapsedSince,
  rejectionOf,
  silentRoute,
  STALL_TEST,
  stallingBodyRoute,
  useLoopbackServers,
} from '../../helpers/loopback-server'
import { server } from '../../msw/server'

/**
 * `timeoutMs` must bound the WHOLE request — connect, headers, and reading
 * the response body. Before this suite existed the SDK cleared its timer
 * the moment `fetch` resolved (headers), so a body that stalled afterwards
 * ran with no deadline. Cancellation lives in `cancel.test.ts`, unknown
 * outcomes in `unknown-outcome.test.ts`.
 *
 * Body-phase cases carry an explicit per-test `timeout`: on a transport that
 * regresses they HANG rather than fail, and the timeout turns that hang into
 * a red test instead of a stuck suite.
 */

const servers = useLoopbackServers()

describe('http.request — timeoutMs covers the whole attempt', () => {
  it('times out while waiting for headers (control)', STALL_TEST, async () => {
    const { baseUrl, requests } = await servers.start({ route: silentRoute })
    const { client } = makeTestHttpClient({
      configOverrides: { baseUrl, timeoutMs: 400, maxRetries: 0 },
    })

    const error = await rejectionOf({
      promise: client.request({ method: 'GET', path: '/v1/contacts' }),
    })

    expect(error).toBeInstanceOf(BrewTimeoutError)
    expect(error).toBeInstanceOf(BrewTransportError)
    expect(error).not.toBeInstanceOf(BrewApiError)
    const timeout = error as BrewTimeoutError
    expect(timeout.name).toBe('TimeoutError')
    expect(timeout.timeoutMs).toBe(400)
    expect(timeout.attempts).toBe(1)
    expect(timeout.method).toBe('GET')
    // At most one: a loaded machine may not deliver it before the deadline.
    expect(requests.length).toBeLessThanOrEqual(1)
  })

  it('times out while the body is still streaming', STALL_TEST, async () => {
    const { baseUrl } = await servers.start({ route: stallingBodyRoute })
    const tracked = afterHeaders()
    const { client } = makeTestHttpClient({
      configOverrides: {
        baseUrl,
        fetch: tracked.fetch,
        timeoutMs: 400,
        maxRetries: 0,
      },
    })
    const started = performance.now()

    const error = await rejectionOf({
      promise: client.request({ method: 'GET', path: '/v1/contacts' }),
    })

    // The headers were in hand before the deadline fired: this is the
    // body-phase timeout the old transport could not see.
    expect(tracked.wereHeadersReceived()).toBe(true)
    expect(error).toBeInstanceOf(BrewTimeoutError)
    expect(elapsedSince({ started })).toBeLessThan(2000)
  })

  it(
    'retries a body-phase timeout by default, one full deadline per attempt',
    STALL_TEST,
    async () => {
      const { baseUrl } = await servers.start({ route: stallingBodyRoute })
      const { client } = makeTestHttpClient({
        configOverrides: { baseUrl, timeoutMs: 250, maxRetries: 2 },
      })

      const error = await rejectionOf({
        promise: client.request({ method: 'GET', path: '/v1/contacts' }),
      })

      expect(error).toBeInstanceOf(BrewTimeoutError)
      expect((error as BrewTimeoutError).attempts).toBe(3)
    }
  )

  it(
    'does not retry a timeout when the request sets retryOnTimeout: false',
    STALL_TEST,
    async () => {
      const { baseUrl } = await servers.start({ route: stallingBodyRoute })
      const { client } = makeTestHttpClient({
        configOverrides: { baseUrl, timeoutMs: 300, maxRetries: 2 },
      })

      const error = await rejectionOf({
        promise: client.request({
          method: 'GET',
          path: '/v1/contacts',
          options: { retryOnTimeout: false },
        }),
      })

      expect(error).toBeInstanceOf(BrewTimeoutError)
      expect((error as BrewTimeoutError).attempts).toBe(1)
    }
  )

  it(
    'does not retry a timeout when the client sets retryOnTimeout: false',
    STALL_TEST,
    async () => {
      const { baseUrl } = await servers.start({ route: stallingBodyRoute })
      const { client } = makeTestHttpClient({
        configOverrides: {
          baseUrl,
          timeoutMs: 300,
          maxRetries: 2,
          retryOnTimeout: false,
        },
      })

      const error = await rejectionOf({
        promise: client.request({ method: 'GET', path: '/v1/contacts' }),
      })

      expect(error).toBeInstanceOf(BrewTimeoutError)
      expect((error as BrewTimeoutError).attempts).toBe(1)
    }
  )

  it(
    'lets a request re-enable timeout retries the client turned off',
    STALL_TEST,
    async () => {
      const { baseUrl } = await servers.start({ route: stallingBodyRoute })
      const { client } = makeTestHttpClient({
        configOverrides: {
          baseUrl,
          timeoutMs: 300,
          maxRetries: 1,
          retryOnTimeout: false,
        },
      })

      const error = await rejectionOf({
        promise: client.request({
          method: 'GET',
          path: '/v1/contacts',
          options: { retryOnTimeout: true },
        }),
      })

      expect(error).toBeInstanceOf(BrewTimeoutError)
      expect((error as BrewTimeoutError).attempts).toBe(2)
    }
  )

  it('treats the runtime giving up on the headers (undici) as a timeout', async () => {
    let calls = 0
    const runtimeHeadersTimeout: typeof globalThis.fetch = () => {
      calls++
      const cause = Object.assign(new Error('Headers Timeout Error'), {
        code: 'UND_ERR_HEADERS_TIMEOUT',
      })
      return Promise.reject(new TypeError('fetch failed', { cause }))
    }
    const { client } = makeTestHttpClient({
      configOverrides: { fetch: runtimeHeadersTimeout, maxRetries: 2 },
    })

    const error = await rejectionOf({
      promise: client.request({
        method: 'GET',
        path: '/v1/contacts',
        options: { retryOnTimeout: false },
      }),
    })

    expect(error).toBeInstanceOf(BrewTimeoutError)
    expect(calls).toBe(1)
  })

  it('treats the runtime giving up on an idle body (undici) as a timeout', async () => {
    const runtimeBodyTimeout: typeof globalThis.fetch = () => {
      const cause = Object.assign(new Error('Body Timeout Error'), {
        code: 'UND_ERR_BODY_TIMEOUT',
      })
      return Promise.reject(new TypeError('fetch failed', { cause }))
    }
    const { client } = makeTestHttpClient({
      configOverrides: { fetch: runtimeBodyTimeout, maxRetries: 0 },
    })

    const error = await rejectionOf({
      promise: client.request({ method: 'GET', path: '/v1/contacts' }),
    })

    expect(error).toBeInstanceOf(BrewTimeoutError)
  })
})

describe('http.request — a custom fetch that ignores the signal is still bounded', () => {
  /** Hands back a body that sends a few bytes and then never ends. */
  const ignoringFetch: typeof globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"contacts":'))
            // Never closes, never errors, and never looks at any signal.
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

  it('times out', STALL_TEST, async () => {
    const { client } = makeTestHttpClient({
      configOverrides: { fetch: ignoringFetch, timeoutMs: 150, maxRetries: 0 },
    })
    const started = performance.now()

    const error = await rejectionOf({
      promise: client.request({ method: 'GET', path: '/v1/contacts' }),
    })

    expect(error).toBeInstanceOf(BrewTimeoutError)
    expect(elapsedSince({ started })).toBeLessThan(1500)
  })

  it('cancels', STALL_TEST, async () => {
    const { client } = makeTestHttpClient({
      configOverrides: { fetch: ignoringFetch, maxRetries: 0 },
    })
    const controller = new AbortController()
    setTimeout(() => {
      controller.abort()
    }, 50)

    const error = await rejectionOf({
      promise: client.request({
        method: 'GET',
        path: '/v1/contacts',
        options: { signal: controller.signal },
      }),
    })

    expect(error).toBe(controller.signal.reason)
  })
})

describe('http.request — timeoutMs values the platform timer would refuse', () => {
  it('accepts a fractional timeoutMs', async () => {
    server.use(
      http.get('https://brew.new/api/v1/contacts', () =>
        HttpResponse.json({ contacts: [] })
      )
    )
    const { client } = makeTestHttpClient({
      configOverrides: { timeoutMs: 1500.5 },
    })

    const result = await client.request({ method: 'GET', path: '/v1/contacts' })

    expect(result.status).toBe(200)
  })

  it('treats an unbounded timeoutMs as no deadline, not as zero', async () => {
    server.use(
      http.get('https://brew.new/api/v1/contacts', () =>
        HttpResponse.json({ contacts: [] })
      )
    )
    const { client } = makeTestHttpClient({
      configOverrides: { timeoutMs: Number.POSITIVE_INFINITY },
    })

    const result = await client.request({ method: 'GET', path: '/v1/contacts' })

    expect(result.status).toBe(200)
  })
})

describe('http.request — which deadline applies', () => {
  /** Time out against a server that never answers and report the deadline used. */
  async function deadlineUsed({
    clientMs,
    methodFloorMs,
    requestMs,
  }: {
    clientMs: number
    methodFloorMs?: number
    requestMs?: number
  }): Promise<number> {
    const { baseUrl } = await servers.start({ route: silentRoute })
    const { client } = makeTestHttpClient({
      configOverrides: { baseUrl, timeoutMs: clientMs, maxRetries: 0 },
    })
    const error = await rejectionOf({
      promise: client.request({
        method: 'GET',
        path: '/v1/contacts',
        ...(methodFloorMs === undefined
          ? {}
          : { defaultTimeoutMs: methodFloorMs }),
        ...(requestMs === undefined
          ? {}
          : { options: { timeoutMs: requestMs } }),
      }),
    })
    expect(error).toBeInstanceOf(BrewTimeoutError)
    return (error as BrewTimeoutError).timeoutMs
  }

  it(
    'raises a shorter client timeout to the method floor',
    STALL_TEST,
    async () => {
      expect(await deadlineUsed({ clientMs: 50, methodFloorMs: 300 })).toBe(300)
    }
  )

  it(
    'never shortens a longer client timeout to the method floor',
    STALL_TEST,
    async () => {
      expect(await deadlineUsed({ clientMs: 300, methodFloorMs: 50 })).toBe(300)
    }
  )

  it('lets a per-request timeoutMs win over both', STALL_TEST, async () => {
    expect(
      await deadlineUsed({ clientMs: 300, methodFloorMs: 250, requestMs: 60 })
    ).toBe(60)
  })
})

describe('http.request — invalid timeoutMs and maxRetries are refused', () => {
  it.each([Number.NaN, -1])('refuses a client timeoutMs of %s', (value) => {
    expect(() =>
      createBrewClient({ apiKey: 'brew_test_abc', timeoutMs: value })
    ).toThrow(TypeError)
  })

  it.each([Number.NaN, -1])(
    'refuses a request timeoutMs of %s instead of waiting forever',
    async (value) => {
      const { client } = makeTestHttpClient()

      const error = await rejectionOf({
        promise: client.request({
          method: 'GET',
          path: '/v1/contacts',
          options: { timeoutMs: value },
        }),
      })

      expect(error).toBeInstanceOf(TypeError)
      expect((error as TypeError).message).toMatch(/timeoutMs/)
    }
  )

  it.each([Number.NaN, -1, 1.5])('refuses maxRetries of %s', (value) => {
    expect(() =>
      createBrewClient({ apiKey: 'brew_test_abc', maxRetries: value })
    ).toThrow(TypeError)
  })
})
