import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createBrewClient } from '../../../src/client'
import { BrewApiError } from '../../../src/core/errors'
import { makeTestHttpClient } from '../../helpers/http-client'
import {
  afterHeaders,
  elapsedSince,
  errorEnvelope,
  rejectionOf,
  silentRoute,
  STALL_TEST,
  stallingBodyRoute,
  useLoopbackServers,
} from '../../helpers/loopback-server'
import { server } from '../../msw/server'

const servers = useLoopbackServers()

describe('http.request — the caller can cancel at any point', () => {
  it(
    'rejects with the signal reason while waiting for headers (control)',
    STALL_TEST,
    async () => {
      const { baseUrl, requests } = await servers.start({ route: silentRoute })
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

      expect(error).toBe(controller.signal.reason)
      expect((error as Error).name).toBe('AbortError')
      expect(requests.length).toBeLessThanOrEqual(1)
    }
  )

  it(
    'rejects with the signal reason while the body is streaming',
    STALL_TEST,
    async () => {
      const { baseUrl, requests } = await servers.start({
        route: stallingBodyRoute,
      })
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
      const { baseUrl, requests } = await servers.start({
        route: stallingBodyRoute,
      })
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

describe('http.request — client-level signal', () => {
  it('cancels every request made through the client', STALL_TEST, async () => {
    const { baseUrl } = await servers.start({ route: stallingBodyRoute })
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
    const { baseUrl, requests } = await servers.start({ route: silentRoute })
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
    expect(requests.length).toBeLessThanOrEqual(1)
  })
})
