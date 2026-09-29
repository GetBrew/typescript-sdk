import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { BrewApiError, BrewTimeoutError } from '../../../src/core/errors'
import { makeTestHttpClient } from '../../helpers/http-client'
import {
  errorEnvelope,
  keyRecordingFetch,
  rejectionOf,
  sendJson,
  silentRoute,
  STALL_TEST,
  useLoopbackServers,
} from '../../helpers/loopback-server'
import { server } from '../../msw/server'

/**
 * A timeout or dropped connection leaves a write's outcome unknown. The
 * error must carry the idempotency key the request was sent with, and a
 * retry that finds the first attempt still running must report the
 * timeout — not a conflict.
 */

const servers = useLoopbackServers()

describe('http.request — the idempotency key survives an unknown outcome', () => {
  it('puts the key it sent on a timeout from a POST', STALL_TEST, async () => {
    const { baseUrl } = await servers.start({ route: silentRoute })
    const sentKeys: Array<string | null> = []
    const { client } = makeTestHttpClient({
      configOverrides: {
        baseUrl,
        fetch: keyRecordingFetch({ sentKeys }),
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
    expect((error as BrewTimeoutError).idempotencyKey).toBe(sentKeys[0])
    expect((error as BrewTimeoutError).idempotencyKey).toEqual(
      expect.any(String)
    )
  })

  it('carries no key for a GET', STALL_TEST, async () => {
    const { baseUrl } = await servers.start({ route: silentRoute })
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
      const { baseUrl, requests } = await servers.start({
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
      const sentKeys: Array<string | null> = []
      const { client } = makeTestHttpClient({
        configOverrides: {
          baseUrl,
          fetch: keyRecordingFetch({ sentKeys }),
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
      expect(sentKeys).toHaveLength(timeout.attempts)
      expect(new Set(sentKeys).size).toBe(1)
      expect(timeout.idempotencyKey).toBe(sentKeys[0])
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
