import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'

import { createBrewClient } from '../../../src/client'
import {
  BrewApiError,
  BrewTimeoutError,
  BrewTransportError,
} from '../../../src/core/errors'
import { makeTestHttpClient } from '../../helpers/http-client'
import {
  afterHeaders,
  errorEnvelope,
  keyRecordingFetch,
  type Loopback,
  rejectionOf,
  sendJson,
  startJson,
  startLoopback,
} from '../../helpers/loopback-server'
import { server } from '../../msw/server'

/**
 * `timeoutMs` and the caller's `AbortSignal` must bound the WHOLE request —
 * connect, headers, and reading the response body — and a caller abort must
 * never be retried. Before this suite existed the SDK cleared its timer and
 * detached the caller's signal the moment `fetch` resolved (headers), so a
 * body that stalled afterwards ran with no deadline and no way to cancel it.
 *
 * Body-phase cases carry an explicit per-test `timeout`: on a transport that
 * regresses they HANG rather than fail, and the timeout turns that hang into
 * a red test instead of a stuck suite.
 */

const STALL_TEST = { timeout: 4000 }

let loopback: Loopback | undefined

afterEach(async () => {
  await loopback?.close()
  loopback = undefined
})

/** Headers and part of the JSON body immediately, then nothing, ever. */
async function stallingBodyServer(): Promise<Loopback> {
  loopback = await startLoopback({
    route: ({ res }) => {
      startJson({ res, status: 200, partial: '{"contacts":[{"email":' })
    },
  })
  return loopback
}

/** Never writes a byte: the headers never arrive. */
async function silentServer(): Promise<Loopback> {
  loopback = await startLoopback({
    route: () => {
      // Hold the socket open and say nothing.
    },
  })
  return loopback
}

function elapsedSince({ started }: { started: number }): number {
  return performance.now() - started
}

describe('http.request — timeoutMs covers the whole attempt', () => {
  it('times out while waiting for headers (control)', STALL_TEST, async () => {
    const { baseUrl, requests } = await silentServer()
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
    const { baseUrl } = await stallingBodyServer()
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
      const { baseUrl } = await stallingBodyServer()
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
      const { baseUrl } = await stallingBodyServer()
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
      const { baseUrl } = await stallingBodyServer()
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
      const { baseUrl } = await stallingBodyServer()
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

describe('http.request — the caller can cancel at any point', () => {
  it(
    'rejects with the signal reason while waiting for headers (control)',
    STALL_TEST,
    async () => {
      const { baseUrl, requests } = await silentServer()
      const { client } = makeTestHttpClient({ configOverrides: { baseUrl } })
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

      // The caller's own reason, not a copy: `fetch` rejects with it verbatim
      // and consumers compare against it.
      expect(error).toBe(controller.signal.reason)
      expect((error as Error).name).toBe('AbortError')
      // At most one: a loaded machine may not deliver it before the abort.
      expect(requests.length).toBeLessThanOrEqual(1)
    }
  )

  it(
    'rejects with the signal reason while the body is streaming',
    STALL_TEST,
    async () => {
      const { baseUrl, requests } = await stallingBodyServer()
      const controller = new AbortController()
      const tracked = afterHeaders({
        then: () => {
          controller.abort()
        },
      })
      const { client } = makeTestHttpClient({
        configOverrides: { baseUrl, fetch: tracked.fetch },
      })
      const started = performance.now()

      const error = await rejectionOf({
        promise: client.request({
          method: 'GET',
          path: '/v1/contacts',
          options: { signal: controller.signal },
        }),
      })

      expect(tracked.wereHeadersReceived()).toBe(true)
      expect(error).toBe(controller.signal.reason)
      expect(elapsedSince({ started })).toBeLessThan(2000)
      expect(requests).toHaveLength(1)
    }
  )

  it(
    'rethrows a non-Error abort reason exactly as given, without retrying',
    STALL_TEST,
    async () => {
      const { baseUrl, requests } = await stallingBodyServer()
      const controller = new AbortController()
      const tracked = afterHeaders({
        then: () => {
          controller.abort('shutting down')
        },
      })
      const { client } = makeTestHttpClient({
        configOverrides: { baseUrl, fetch: tracked.fetch, maxRetries: 2 },
      })

      const error = await rejectionOf({
        promise: client.request({
          method: 'GET',
          path: '/v1/contacts',
          options: { signal: controller.signal },
        }),
      })

      expect(tracked.wereHeadersReceived()).toBe(true)
      expect(error).toBe('shutting down')
      expect(requests).toHaveLength(1)
    }
  )

  it('lets a caller abort win over a deadline that fires at the same time', async () => {
    const controller = new AbortController()
    controller.abort(new Error('caller gave up'))
    const { client } = makeTestHttpClient({ configOverrides: { timeoutMs: 1 } })

    const error = await rejectionOf({
      promise: client.request({
        method: 'GET',
        path: '/v1/contacts',
        options: { signal: controller.signal },
      }),
    })

    expect(error).toBe(controller.signal.reason)
  })

  it('never retries a caller abort, whatever a custom fetch rejects with', async () => {
    let calls = 0
    // A wrapper that turns an abort into its own error, as proxies and
    // instrumentation layers often do. The SDK must still see a CALLER abort.
    const wrappingFetch: typeof globalThis.fetch = (_input, init) => {
      calls++
      return new Promise((_resolve, reject) => {
        const signal = init?.signal
        const fail = (): void => {
          reject(new Error('cancelled by wrapper'))
        }
        if (signal?.aborted === true) {
          fail()
          return
        }
        signal?.addEventListener('abort', fail, { once: true })
      })
    }
    const { client } = makeTestHttpClient({
      configOverrides: { fetch: wrappingFetch, maxRetries: 2 },
    })
    const controller = new AbortController()
    setTimeout(() => {
      controller.abort()
    }, 20)

    const error = await rejectionOf({
      promise: client.request({
        method: 'GET',
        path: '/v1/contacts',
        options: { signal: controller.signal },
      }),
    })

    expect(error).toBe(controller.signal.reason)
    expect(calls).toBe(1)
  })

  it(
    'cancels during a Retry-After backoff instead of sleeping it out',
    STALL_TEST,
    async () => {
      server.use(
        http.get('https://brew.new/api/v1/contacts', () =>
          HttpResponse.json(
            errorEnvelope({
              code: 'SERVICE_UNAVAILABLE',
              type: 'service_unavailable',
            }),
            { status: 503, headers: { 'retry-after': '5' } }
          )
        )
      )
      // The real, timer-backed sleep: this is the one test that must wait.
      const { client } = makeTestHttpClient({
        configOverrides: { maxRetries: 2 },
        useRealSleep: true,
      })
      const controller = new AbortController()
      setTimeout(() => {
        controller.abort()
      }, 100)
      const started = performance.now()

      const error = await rejectionOf({
        promise: client.request({
          method: 'GET',
          path: '/v1/contacts',
          options: { signal: controller.signal },
        }),
      })

      expect(error).toBe(controller.signal.reason)
      expect(elapsedSince({ started })).toBeLessThan(1500)
    }
  )

  it('does not wait out a Retry-After longer than a minute; the caller decides', async () => {
    let calls = 0
    server.use(
      http.get('https://brew.new/api/v1/contacts', () => {
        calls++
        return HttpResponse.json(
          errorEnvelope({ code: 'RATE_LIMITED', type: 'rate_limit' }),
          { status: 429, headers: { 'retry-after': '120' } }
        )
      })
    )
    const { client, sleepCalls } = makeTestHttpClient({
      configOverrides: { maxRetries: 2 },
    })

    const error = await rejectionOf({
      promise: client.request({ method: 'GET', path: '/v1/contacts' }),
    })

    expect(error).toBeInstanceOf(BrewApiError)
    expect((error as BrewApiError).retryAfter).toBe(120)
    expect(calls).toBe(1)
    expect(sleepCalls).toEqual([])
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

describe('http.request — client-level signal', () => {
  it('cancels every request made through the client', STALL_TEST, async () => {
    const { baseUrl } = await stallingBodyServer()
    const controller = new AbortController()
    const tracked = afterHeaders({
      then: () => {
        controller.abort()
      },
    })
    const { client } = makeTestHttpClient({
      configOverrides: {
        baseUrl,
        fetch: tracked.fetch,
        signal: controller.signal,
      },
    })

    const error = await rejectionOf({
      promise: client.request({ method: 'GET', path: '/v1/contacts' }),
    })

    expect(tracked.wereHeadersReceived()).toBe(true)
    expect(error).toBe(controller.signal.reason)
  })

  it('carries through withBrand()', STALL_TEST, async () => {
    const { baseUrl, requests } = await silentServer()
    const controller = new AbortController()
    const brew = createBrewClient({
      apiKey: 'brew_test_abc',
      baseUrl,
      signal: controller.signal,
    })
    setTimeout(() => {
      controller.abort()
    }, 50)

    const error = await rejectionOf({
      promise: brew.withBrand('brd_1').domains.list(),
    })

    expect(error).toBe(controller.signal.reason)
    // At most one: a loaded machine may not deliver it before the abort.
    expect(requests.length).toBeLessThanOrEqual(1)
  })
})

describe('http.request — the idempotency key survives an unknown outcome', () => {
  it('puts the key it sent on a timeout from a POST', STALL_TEST, async () => {
    const { baseUrl } = await silentServer()
    const recorded = keyRecordingFetch()
    const { client } = makeTestHttpClient({
      configOverrides: {
        baseUrl,
        fetch: recorded.fetch,
        timeoutMs: 300,
        maxRetries: 0,
      },
    })

    const error = await rejectionOf({
      promise: client.request({
        method: 'POST',
        path: '/v1/emails',
        body: { prompt: 'x' },
      }),
    })

    expect(error).toBeInstanceOf(BrewTimeoutError)
    expect((error as BrewTimeoutError).idempotencyKey).toBe(
      recorded.sentKeys[0]
    )
    expect((error as BrewTimeoutError).idempotencyKey).toEqual(
      expect.any(String)
    )
  })

  it('carries no key for a GET', STALL_TEST, async () => {
    const { baseUrl } = await silentServer()
    const { client } = makeTestHttpClient({
      configOverrides: { baseUrl, timeoutMs: 300, maxRetries: 0 },
    })

    const error = await rejectionOf({
      promise: client.request({ method: 'GET', path: '/v1/contacts' }),
    })

    expect((error as BrewTimeoutError).idempotencyKey).toBeUndefined()
  })

  it(
    'reports the timeout, not a conflict, when the retry finds the first attempt still running',
    STALL_TEST,
    async () => {
      const { baseUrl, requests } = await startLoopbackInto({
        route: ({ res, attempt }) => {
          if (attempt === 1) return // still "working" on it
          sendJson({
            res,
            status: 409,
            body: errorEnvelope({
              code: 'IDEMPOTENCY_IN_PROGRESS',
              type: 'conflict',
              message:
                'A request with this Idempotency-Key is already in progress.',
            }),
          })
        },
      })
      const recorded = keyRecordingFetch()
      const { client } = makeTestHttpClient({
        configOverrides: {
          baseUrl,
          fetch: recorded.fetch,
          timeoutMs: 300,
          maxRetries: 3,
        },
      })

      const error = await rejectionOf({
        promise: client.request({
          method: 'POST',
          path: '/v1/emails',
          body: { prompt: 'x' },
        }),
      })

      expect(error).toBeInstanceOf(BrewTimeoutError)
      const timeout = error as BrewTimeoutError
      expect(timeout.inProgress).toBe(true)
      expect(timeout.message).toMatch(/still (running|processing)/i)
      // The call ended at the 409, before its retry budget ran out. (Usually
      // on attempt 2; a loaded machine can time a later attempt out first.)
      expect(timeout.attempts).toBeGreaterThanOrEqual(2)
      expect(timeout.attempts).toBeLessThan(4)
      expect(recorded.sentKeys).toHaveLength(timeout.attempts)
      expect(new Set(recorded.sentKeys).size).toBe(1)
      expect(timeout.idempotencyKey).toBe(recorded.sentKeys[0])
      expect(requests.at(-1)?.idempotencyKey).toBe(timeout.idempotencyKey)
    }
  )

  it('still reports a genuine conflict as a BrewApiError', async () => {
    server.use(
      http.post('https://brew.new/api/v1/emails', () =>
        HttpResponse.json(
          errorEnvelope({
            code: 'IDEMPOTENCY_IN_PROGRESS',
            type: 'conflict',
          }),
          { status: 409 }
        )
      )
    )
    const { client } = makeTestHttpClient()

    const error = await rejectionOf({
      promise: client.request({
        method: 'POST',
        path: '/v1/emails',
        body: { prompt: 'x' },
      }),
    })

    // No earlier attempt of THIS call is in flight, so the 409 is real news.
    expect(error).toBeInstanceOf(BrewApiError)
    expect((error as BrewApiError).code).toBe('IDEMPOTENCY_IN_PROGRESS')
    expect((error as BrewApiError).idempotencyKey).toEqual(expect.any(String))
  })
})

/** Start a loopback with a custom route and register it for cleanup. */
async function startLoopbackInto({
  route,
}: {
  route: Parameters<typeof startLoopback>[0]['route']
}): Promise<Loopback> {
  loopback = await startLoopback({ route })
  return loopback
}

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
    const { baseUrl } = await silentServer()
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
