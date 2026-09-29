import { afterEach, describe, expect, it } from 'vitest'

import { makeTestHttpClient } from '../../helpers/http-client'
import {
  type Loopback,
  sendJson,
  startLoopback,
} from '../../helpers/loopback-server'

/**
 * A retryable response (408/429/5xx) is thrown away, but its body is still
 * on the wire. Left alone, the server keeps streaming into a client that will
 * never read it, and the socket plus its buffered bytes are held until the
 * `Response` happens to be garbage collected.
 *
 * The assertion is on what the SERVER observes — its response closed by the
 * client before the next attempt starts — never on how many sockets were
 * opened: an HTTP/1.1 connection with an unread body can never be reused, so
 * releasing it closes it rather than returning it to a pool.
 */

let loopback: Loopback | undefined

afterEach(async () => {
  await loopback?.close()
  loopback = undefined
})

describe('http.request — a discarded attempt releases its body', () => {
  it(
    'closes each retried 503 before the next attempt starts',
    {
      timeout: 4000,
    },
    async () => {
      loopback = await startLoopback({
        route: ({ res, attempt, every }) => {
          if (attempt <= 2) {
            res.writeHead(503, { 'content-type': 'application/json' })
            every({
              ms: 5,
              fn: () => {
                res.write(' '.repeat(16 * 1024))
              },
            })
            return
          }
          sendJson({ res, status: 200, body: { contacts: [] } })
        },
      })
      const { client } = makeTestHttpClient({
        configOverrides: { baseUrl: loopback.baseUrl, maxRetries: 2 },
      })

      const result = await client.request({
        method: 'GET',
        path: '/v1/contacts',
      })

      expect(result.status).toBe(200)
      const { requests, clientCloses } = loopback
      expect(requests).toHaveLength(3)
      expect(clientCloses.map((close) => close.attempt)).toEqual([1, 2])
      expect(clientCloses[0]?.at).toBeLessThan(requests[1]?.at ?? 0)
      expect(clientCloses[1]?.at).toBeLessThan(requests[2]?.at ?? 0)
    }
  )
})
