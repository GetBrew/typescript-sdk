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
 * The assertion is on what the SERVER observes — each discarded response
 * closed by the client promptly — never on how many sockets were opened: an
 * HTTP/1.1 connection with an unread body can never be reused, so releasing
 * it closes it rather than returning it to a pool. Nor on the ORDER of that
 * close and the next attempt's request: the server sees the old socket's FIN
 * and the new connection's request as independent I/O events (CI observed
 * them 1.7 ms "out of order"). Without the release the close never comes at
 * all while the test runs.
 */

/** Poll `isDone` until it holds or `timeoutMs` passes. */
async function waitFor({
  isDone,
  timeoutMs,
}: {
  isDone: () => boolean
  timeoutMs: number
}): Promise<void> {
  const deadline = performance.now() + timeoutMs
  while (!isDone() && performance.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop -- polling is sequential by nature.
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

let loopback: Loopback | undefined

afterEach(async () => {
  await loopback?.close()
  loopback = undefined
})

describe('http.request — a discarded attempt releases its body', () => {
  it(
    'closes each retried 503 promptly, not at garbage collection',
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
      await waitFor({ isDone: () => clientCloses.length >= 2, timeoutMs: 1000 })
      expect(requests).toHaveLength(3)
      expect(clientCloses.map((close) => close.attempt)).toEqual([1, 2])
      // Released at the retry, not at garbage collection: each close lands
      // within a moment of the attempt that replaced it.
      for (const close of clientCloses) {
        const next = requests[close.attempt]
        expect(Math.abs(close.at - (next?.at ?? Number.NaN))).toBeLessThan(250)
      }
    }
  )
})
