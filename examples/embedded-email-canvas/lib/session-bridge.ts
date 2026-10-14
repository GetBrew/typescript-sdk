import {
  BrewEmbedError,
  type CanvasSession,
  type CanvasTarget,
  createCanvasSessionProvider,
} from '@brew.new/sdk/embed'

/** One bridge per mounted canvas; credentials stay in memory and never in URLs/storage. */
export function createSessionBridge(
  target: CanvasTarget,
  fetcher: typeof fetch = fetch
) {
  const owners = new Map<string, string>()
  let isClosed = false
  let isDestroyed = false
  const pending = new Set<Promise<CanvasSession>>()
  let closing: Promise<void> | null = null
  const endpoint = '/api/canvas-session'
  async function revoke(sessionId: string, ownershipToken: string) {
    const response = await fetcher(endpoint, {
      method: 'DELETE',
      credentials: 'same-origin',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'X-Canvas-Owner': ownershipToken,
      },
      body: JSON.stringify({ target, sessionId }),
    })
    if (!response.ok) {
      throw new Error(
        'Could not close the canvas session. Try again before leaving.'
      )
    }
    owners.delete(sessionId)
  }
  const provider = createCanvasSessionProvider(endpoint, {
    fetch: async (url, init) => {
      const input: unknown = JSON.parse(String(init?.body))
      const sessionId =
        input &&
        typeof input === 'object' &&
        'sessionId' in input &&
        typeof input.sessionId === 'string'
          ? input.sessionId
          : undefined
      const headers = new Headers(init?.headers)
      if (sessionId) {
        headers.set('X-Canvas-Owner', owners.get(sessionId) ?? '')
      }
      init?.signal?.throwIfAborted()
      // Finish issuance after unmount so a late grant can still be revoked.
      const response = await fetcher(url, {
        ...init,
        headers,
        signal: sessionId ? init?.signal : AbortSignal.timeout(30_000),
      })
      if (!response.ok) {
        const failure: unknown = await response
          .clone()
          .json()
          .catch(() => null)
        const message =
          failure &&
          typeof failure === 'object' &&
          'error' in failure &&
          typeof failure.error === 'string'
            ? failure.error.slice(0, 300)
            : 'Could not authorize the canvas. Try again.'
        throw new BrewEmbedError(
          response.status >= 500
            ? 'CONNECTION_FAILED'
            : 'AUTHENTICATION_FAILED',
          message
        )
      }
      if (response.ok) {
        const grant: unknown = await response.clone().json()
        if (
          grant &&
          typeof grant === 'object' &&
          'sessionId' in grant &&
          typeof grant.sessionId === 'string' &&
          'ownershipToken' in grant &&
          typeof grant.ownershipToken === 'string' &&
          /^[a-f0-9]{64}$/.test(grant.ownershipToken)
        ) {
          owners.set(grant.sessionId, grant.ownershipToken)
        } else {
          throw new BrewEmbedError(
            'AUTHENTICATION_FAILED',
            'The host returned an invalid session ownership receipt.'
          )
        }
      }
      return response
    },
  })
  async function close() {
    if (isClosed) {
      return
    }
    if (closing) {
      return closing
    }
    const attempt = (async () => {
      await Promise.allSettled([...pending])
      await Promise.all(Array.from(owners, ([id, proof]) => revoke(id, proof)))
      isClosed = true
    })()
    closing = attempt
    try {
      await attempt
    } finally {
      if (closing === attempt) {
        closing = null
      }
    }
  }
  return {
    getSession: async (request: Parameters<typeof provider>[0]) => {
      if (closing) {
        await closing.catch(() => undefined)
      }
      if (isClosed || isDestroyed) {
        throw new BrewEmbedError('DESTROYED', 'The workspace is closed.')
      }
      const acquisition = provider(request)
      pending.add(acquisition)
      try {
        return await acquisition
      } finally {
        pending.delete(acquisition)
      }
    },
    close,
    destroy: async () => {
      isDestroyed = true
      await close()
    },
  }
}
