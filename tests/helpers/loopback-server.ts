import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'

import { http, passthrough } from 'msw'
import { afterEach } from 'vitest'

import { server as mswServer } from '../msw/server'

export type LoopbackRequest = {
  readonly attempt: number
  readonly method: string
  readonly url: string
  readonly idempotencyKey: string | undefined
  readonly at: number
}

export type LoopbackClientClose = {
  readonly attempt: number
  readonly at: number
}

export type LoopbackRouteInput = {
  readonly req: IncomingMessage
  readonly res: ServerResponse
  readonly attempt: number
  readonly later: (input: { ms: number; fn: () => void }) => void
  readonly every: (input: { ms: number; fn: () => void }) => void
}

export type Loopback = {
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

export function keyRecordingFetch({
  sentKeys,
}: {
  sentKeys: Array<string | null>
}): typeof globalThis.fetch {
  return (input, init) => {
    sentKeys.push(new Headers(init?.headers).get('idempotency-key'))
    return globalThis.fetch(input, init)
  }
}

export const STALL_TEST = { timeout: 4000 }

export function stallingBodyRoute({ res }: LoopbackRouteInput): void {
  startJson({ res, status: 200, partial: '{"contacts":[{"email":' })
}

export function silentRoute({ res }: LoopbackRouteInput): void {
  res.on('error', () => undefined)
}

export function useLoopbackServers({
  registerCleanup = afterEach,
}: {
  registerCleanup?: (cleanup: () => Promise<void>) => void
} = {}): {
  start: (input: {
    route: (input: LoopbackRouteInput) => void
  }) => Promise<Loopback>
} {
  let current: Loopback | undefined
  registerCleanup(async () => {
    await current?.close()
    current = undefined
  })
  return {
    start: async ({ route }) => {
      current = await startLoopback({ route })
      return current
    },
  }
}

export function elapsedSince({ started }: { started: number }): number {
  return performance.now() - started
}
