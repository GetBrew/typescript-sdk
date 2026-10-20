import { BrewEmbedError, isCanvasSession } from './contracts'
import type { CanvasSessionRequest, CanvasSessionProvider } from './controller'

/** Connects the browser component to an authenticated endpoint in your own app. */
export function createCanvasSessionProvider(
  endpoint: string,
  options: Readonly<{ fetch?: typeof fetch }> = {}
): CanvasSessionProvider {
  return async ({ target, sessionId, signal }: CanvasSessionRequest) => {
    try {
      const response = await (options.fetch ?? globalThis.fetch)(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
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
