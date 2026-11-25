import { afterEach, describe, expect, it } from 'vitest'

import { makeTestHttpClient } from '../../helpers/http-client'
import {
  type Loopback,
  sendJson,
  startLoopback,
} from '../../helpers/loopback-server'

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
      for (const close of clientCloses) {
        const next = requests[close.attempt]
        expect(Math.abs(close.at - (next?.at ?? Number.NaN))).toBeLessThan(250)
      }
    }
  )
})
