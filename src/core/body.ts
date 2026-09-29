import { throwReason } from './signals'

/**
 * Reading and releasing response bodies under an abort signal: a body read
 * the signal can end at once (and that releases the connection when it
 * does), and a best-effort release of a body being thrown away.
 */

/**
 * Read a response body as UTF-8 text, bounded by `signal`.
 *
 * Reads through its own reader rather than `response.text()`: `text()`
 * locks the stream for its whole lifetime, and a locked stream cannot be
 * cancelled — `body.cancel()` throws `Invalid state: ReadableStream is
 * locked` and releases nothing. Owning the reader lets an abort both end the
 * read at once AND release the connection.
 *
 * Native `fetch` already errors the body when the request signal aborts, so
 * on undici the listener below is belt and braces. It is not redundant:
 * `config.fetch` is public, and a wrapper, polyfill or test double may hand
 * back a body that ignores the signal entirely — which would silently bring
 * back the exact hang this exists to prevent.
 */
export async function readTextWithin({
  response,
  signal,
}: {
  readonly response: Response
  readonly signal: AbortSignal
}): Promise<string> {
  const stream = response.body
  if (stream === null) return ''

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let wasAborted = false

  const onAbort = (): void => {
    wasAborted = true
    // Not awaited: a pending `read()` settles as part of the cancel, and
    // waiting on the source's own cleanup is exactly what could hang.
    reader.cancel(signal.reason).catch(() => {
      // Nothing left to release.
    })
  }

  if (signal.aborted) {
    onAbort()
  } else {
    signal.addEventListener('abort', onAbort, { once: true })
  }

  try {
    let text = ''
    /* eslint-disable no-await-in-loop --
     * A stream is read one chunk at a time; that is what a stream is. */
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      text += decoder.decode(chunk.value, { stream: true })
    }
    /* eslint-enable no-await-in-loop */
    text += decoder.decode()

    // A cancelled read ends like a short body. Without this check a
    // deadline would surface as a truncated payload and a SyntaxError.
    if (wasAborted) throwReason({ reason: signal.reason })
    return text
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}

/**
 * Release a body we are abandoning. Best effort: `cancel()` throws on a
 * locked or used stream and rejects on an errored one, and neither matters
 * when the response is being thrown away. The wait is bounded to one turn
 * of the event loop, so a custom stream whose cancel never settles cannot
 * stall the retry.
 */
export async function cancelBody({
  response,
  reason,
}: {
  readonly response: Response | undefined
  readonly reason?: unknown
}): Promise<void> {
  const body = response?.body
  if (body === null || body === undefined || response?.bodyUsed === true) {
    return
  }
  let cancelled: Promise<void>
  try {
    cancelled = body.cancel(reason).catch(() => {
      // Already errored or closed.
    })
  } catch {
    return
  }
  await Promise.race([
    cancelled,
    new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    }),
  ])
}
