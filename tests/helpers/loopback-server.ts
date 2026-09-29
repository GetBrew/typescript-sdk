import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'

import { http, passthrough } from 'msw'

import { server as mswServer } from '../msw/server'

/**
 * A real HTTP server on 127.0.0.1 for the transport tests MSW cannot
 * express.
 *
 * MSW resolves a mocked `Response` whose body stream has no relationship to
 * the request signal, so a body that stalls after the headers never ends and
 * an abort never reaches it. A socket reset mid-body cannot be mocked either.
 * Anything that depends on the BODY phase — a deadline or a cancel while the
 * body streams, a connection dropping after the headers, releasing a
 * discarded body — needs a real socket, and this is that socket.
 *
 * `tests/setup.ts` runs MSW with `onUnhandledRequest: 'error'`, which refuses
 * to let an unmatched request through, so `startLoopback` registers an
 * explicit `passthrough()` for its own origin. The global `afterEach`
 * `server.resetHandlers()` removes it again.
 */
export type LoopbackRequest = {
  /** 1 for the first request this server received, 2 for the second, … */
  readonly attempt: number
  readonly method: string
  readonly url: string
  readonly idempotencyKey: string | undefined
  readonly at: number
}

/** A response the CLIENT closed before the server finished writing it. */
export type LoopbackClientClose = {
  readonly attempt: number
  readonly at: number
}

export type LoopbackRouteInput = {
  readonly req: IncomingMessage
  readonly res: ServerResponse
  readonly attempt: number
  /** Run `fn` after `ms`, unless the client has already gone. */
  readonly later: (input: { ms: number; fn: () => void }) => void
  /** Run `fn` every `ms` until the client goes. */
  readonly every: (input: { ms: number; fn: () => void }) => void
}

export type Loopback = {
  /** Pass as the SDK `baseUrl`; paths land under `/api`. */
  readonly baseUrl: string
  readonly requests: ReadonlyArray<LoopbackRequest>
  readonly clientCloses: ReadonlyArray<LoopbackClientClose>
  readonly close: () => Promise<void>
}

export async function startLoopback({
  route,
}: {
  route: (input: LoopbackRouteInput) => void
}): Promise<Loopback> {
  const requests: Array<LoopbackRequest> = []
  const clientCloses: Array<LoopbackClientClose> = []
  const timers = new Set<ReturnType<typeof setTimeout>>()

  const server = createServer((req, res) => {
    const attempt = requests.length + 1
    const rawKey = req.headers['idempotency-key']
    requests.push({
      attempt,
      method: req.method ?? '',
      url: req.url ?? '',
      idempotencyKey: typeof rawKey === 'string' ? rawKey : undefined,
      at: performance.now(),
    })
    res.on('close', () => {
      if (!res.writableFinished) {
        clientCloses.push({ attempt, at: performance.now() })
      }
    })

    route({
      req,
      res,
      attempt,
      later: ({ ms, fn }) => {
        const timer = setTimeout(() => {
          timers.delete(timer)
          if (!res.destroyed) fn()
        }, ms)
        timers.add(timer)
      },
      every: ({ ms, fn }) => {
        const timer = setInterval(() => {
          if (res.destroyed) {
            clearInterval(timer)
            timers.delete(timer)
            return
          }
          fn()
        }, ms)
        timers.add(timer)
      },
    })
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const { port } = server.address() as AddressInfo
  const origin = `http://127.0.0.1:${String(port)}`

  mswServer.use(http.all(`${origin}/*`, () => passthrough()))

  return {
    baseUrl: `${origin}/api`,
    requests,
    clientCloses,
    close: async () => {
      for (const timer of timers) {
        clearTimeout(timer)
        clearInterval(timer)
      }
      timers.clear()
      server.closeAllConnections()
      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve()
        })
      })
    },
  }
}

/** Write a complete JSON response. */
export function sendJson({
  res,
  status,
  body,
  headers = {},
}: {
  res: ServerResponse
  status: number
  body: unknown
  headers?: Record<string, string>
}): void {
  res.writeHead(status, { 'content-type': 'application/json', ...headers })
  res.end(JSON.stringify(body))
}

/**
 * Write the headers and the first part of a JSON body, then leave the
 * response open. What happens next is up to the route: stall forever, finish
 * later, or drop the connection.
 */
export function startJson({
  res,
  status,
  partial,
  headers = {},
}: {
  res: ServerResponse
  status: number
  partial: string
  headers?: Record<string, string>
}): void {
  res.writeHead(status, { 'content-type': 'application/json', ...headers })
  res.write(partial)
}

/** A standard Brew error envelope, for routes that answer with one. */
export function errorEnvelope({
  code,
  type,
  message = 'Something went wrong.',
}: {
  code: string
  type: string
  message?: string
}): { error: Record<string, string> } {
  return {
    error: {
      code,
      type,
      message,
      suggestion: 'Retry the request.',
      docs: 'https://docs.brew.new/api-reference/api/errors',
    },
  }
}

/**
 * Await a promise that must reject and hand back what it rejected with —
 * which, for a caller abort, is whatever the caller passed to `abort()`,
 * string or otherwise.
 */
export async function rejectionOf({
  promise,
}: {
  promise: Promise<unknown>
}): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the request to reject, but it resolved.')
}

/**
 * Wrap the global fetch so a body-phase test can PROVE its failure happened
 * after the headers arrived. A loaded machine can take longer than a short
 * timer to deliver even the first byte; a test that aborts on a timer alone
 * then silently exercises the headers phase instead, which the transport
 * always handled.
 *
 * `afterMs` (optional) runs `then` that long after the headers are in hand —
 * while the transport is blocked reading the body — which is the moment a
 * body-phase cancel has to land.
 */
export function afterHeaders({
  afterMs = 20,
  then,
}: {
  afterMs?: number
  then?: () => void
} = {}): {
  fetch: typeof globalThis.fetch
  wereHeadersReceived: () => boolean
} {
  let wasReceived = false
  const wrapped: typeof globalThis.fetch = async (input, init) => {
    const response = await globalThis.fetch(input, init)
    wasReceived = true
    if (then !== undefined) setTimeout(then, afterMs)
    return response
  }
  return { fetch: wrapped, wereHeadersReceived: () => wasReceived }
}

/**
 * Wrap the global fetch and record the `Idempotency-Key` each attempt SENT —
 * on the client side, so a test does not depend on the request reaching a
 * server before its deadline (on a loaded machine it may not).
 */
export function keyRecordingFetch(): {
  fetch: typeof globalThis.fetch
  sentKeys: ReadonlyArray<string | null>
} {
  const sentKeys: Array<string | null> = []
  const wrapped: typeof globalThis.fetch = (input, init) => {
    sentKeys.push(new Headers(init?.headers).get('idempotency-key'))
    return globalThis.fetch(input, init)
  }
  return { fetch: wrapped, sentKeys }
}
