import { BrewEmbedError, isCanvasSession } from './contracts'
import type { CanvasSessionRequest, CanvasSessionProvider } from './controller'

async function readSessionHeaders({
  read,
  signal,
}: {
  read: () => HeadersInit | Promise<HeadersInit>
  signal: AbortSignal
}): Promise<HeadersInit> {
  let onAbort = (): void => {}
  const interrupted = new Promise<never>((_resolve, reject) => {
    onAbort = () =>
      reject(
        new BrewEmbedError(
          'CONNECTION_FAILED',
          'Canvas session request was aborted.'
        )
      )
    signal.addEventListener('abort', onAbort, { once: true })
  })
  try {
    // Observe the lookup even after cancellation so a late rejection is consumed.
    return await Promise.race([Promise.resolve().then(read), interrupted])
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}

/** Connects the browser component to an authenticated endpoint in your own app. */
export function createCanvasSessionProvider(
  endpoint: string,
  options: Readonly<{
    fetch?: typeof fetch
    /** Read fresh host authentication or CSRF headers for each session request. */
    headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
  }> = {}
): CanvasSessionProvider {
  return async ({ target, sessionId, signal }: CanvasSessionRequest) => {
    try {
      signal.throwIfAborted()
      const headers = new Headers(
        typeof options.headers === 'function'
          ? await readSessionHeaders({ read: options.headers, signal })
          : options.headers
      )
      signal.throwIfAborted()
      headers.set('Content-Type', 'application/json')
      const response = await (options.fetch ?? globalThis.fetch)(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({ target, ...(sessionId ? { sessionId } : {}) }),
        signal,
      })
      if (!response.ok) {
        throw new BrewEmbedError(
          'AUTHENTICATION_FAILED',
          'Your app could not authorize this canvas.'
        )
      }
      const session: unknown = await response.json()
      if (!isCanvasSession(session)) {
        throw new BrewEmbedError(
          'AUTHENTICATION_FAILED',
          'Your app returned an invalid canvas session.'
        )
      }
      return session
    } catch (error) {
      if (signal.aborted) throw signal.reason
      if (error instanceof BrewEmbedError) throw error
      throw new BrewEmbedError(
        'CONNECTION_FAILED',
        'Could not connect to your canvas session endpoint.'
      )
    }
  }
}
