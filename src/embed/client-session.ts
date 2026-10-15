import {
  BrewEmbedError,
  CANVAS_CLIENT_ID_PATTERN,
  isCanvasSession,
  type CanvasSession,
} from './contracts'
import type { CanvasSessionRequest } from './controller'

type Options = Readonly<{
  clientId: string
  embedOrigin: string
  fetch?: typeof fetch
}>

/** Internal lifecycle for publishable client IDs; ownership secrets stay in memory. */
export function createClientCanvasSessionProvider(options: Options) {
  if (!CANVAS_CLIENT_ID_PATTERN.test(options.clientId)) {
    throw new BrewEmbedError(
      'INVALID_ARGUMENT',
      'Use a client ID from Settings → API → Client apps.'
    )
  }
  const endpoint = `${options.embedOrigin}/api/embed/canvas/clients/${options.clientId}/sessions`
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32))
  const clientSessionToken = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
  const fetcher = options.fetch ?? globalThis.fetch
  let isClosed = false
  let session: CanvasSession | undefined
  let pending: Promise<CanvasSession> | undefined
  let closing: Promise<void> | undefined

  async function revoke(): Promise<void> {
    if (!session) return
    const response = await fetcher(endpoint, {
      method: 'DELETE',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.sessionId,
        clientSessionToken,
      }),
      signal: AbortSignal.timeout(10_000),
      keepalive: true,
    })
    if (!response.ok)
      throw new BrewEmbedError(
        'AUTHENTICATION_FAILED',
        'Could not close canvas access.'
      )
    session = undefined
  }

  async function acquire(
    request: CanvasSessionRequest
  ): Promise<CanvasSession> {
    try {
      // Drain issuance on unmount before revoking: cancelling fetch could lose a created grant.
      const response = await fetcher(endpoint, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: request.target,
          clientSessionToken,
          ...(request.sessionId ? { sessionId: request.sessionId } : {}),
        }),
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok)
        throw new BrewEmbedError(
          'AUTHENTICATION_FAILED',
          'Client app access was denied. Check its allowed origins and target.'
        )
      const grant: unknown = await response.json()
      if (!isCanvasSession(grant))
        throw new BrewEmbedError(
          'AUTHENTICATION_FAILED',
          'Brew returned an invalid canvas session.'
        )
      session = grant
      if (isClosed || request.signal.aborted) {
        if (!isClosed) await revoke()
        if (request.signal.aborted) throw request.signal.reason
        throw new BrewEmbedError('DESTROYED', 'This canvas has been destroyed.')
      }
      return grant
    } catch (error) {
      if (request.signal.aborted) throw request.signal.reason
      if (error instanceof BrewEmbedError) throw error
      throw new BrewEmbedError(
        'CONNECTION_FAILED',
        'Could not connect to Brew. Retry to reconnect.'
      )
    }
  }

  return {
    getSession: (request: CanvasSessionRequest): Promise<CanvasSession> => {
      if (isClosed)
        return Promise.reject(
          new BrewEmbedError('DESTROYED', 'This canvas has been destroyed.')
        )
      if (request.signal.aborted) {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- AbortSignal reasons must retain their original identity.
        return Promise.reject(request.signal.reason)
      }
      pending = acquire(request)
      return pending
    },
    close: (): Promise<void> => {
      if (closing) return closing
      isClosed = true
      closing = (async () => {
        await pending?.catch(() => undefined)
        await revoke()
      })()
      return closing
    },
  }
}
