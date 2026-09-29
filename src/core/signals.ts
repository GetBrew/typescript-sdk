/**
 * Abort-signal plumbing for the transport: the per-attempt signal that
 * carries the deadline through the response body, the caller's signals
 * combined, the abortable backoff, and rethrowing a caller's abort reason
 * exactly as given.
 */

/** A `release` for a signal that attached no listener: nothing to undo. */
const RELEASE_NOTHING = (): void => undefined

export type AttemptSignal = {
  /** Handed to `fetch`; stays live through the body read. */
  readonly signal: AbortSignal
  /** The deadline alone, so a failure is attributed by flag. */
  readonly timeoutSignal: AbortSignal
  /** Abort this attempt because its response is being thrown away. */
  readonly discard: () => void
  /** Detaches any listener on the caller's signal. */
  readonly release: () => void
}

/**
 * The signal for one attempt: the caller's, plus a fresh deadline.
 *
 * `AbortSignal.timeout` is the heart of the fix. `fetch` keeps its request
 * signal bound to the response body, so the deadline — and the caller's
 * abort — reach the body read as well as the headers. The hand-rolled
 * `setTimeout` it replaces could only ever cover the headers: the one safe
 * moment to clear that timer was when `fetch` resolved.
 *
 * Nothing needs clearing on the native path: the `AbortSignal.timeout`
 * timer is unref'd (it never keeps a process alive) and `AbortSignal.any`
 * holds its composite weakly from the sources.
 */
export function createAttemptSignal({
  timeoutMs,
  callerSignal,
}: {
  readonly timeoutMs: number
  readonly callerSignal: AbortSignal | undefined
}): AttemptSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const discarded = new AbortController()
  const combined = anySignal({
    signals:
      callerSignal === undefined
        ? [timeoutSignal, discarded.signal]
        : [callerSignal, timeoutSignal, discarded.signal],
  })
  return {
    signal: combined.signal,
    timeoutSignal,
    discard: () => {
      discarded.abort(
        new DOMException(
          'The SDK discarded this response to retry the request.',
          'AbortError'
        )
      )
    },
    release: combined.release,
  }
}

export function combineCallerSignals({
  signals,
}: {
  readonly signals: ReadonlyArray<AbortSignal | undefined>
}): { readonly signal: AbortSignal | undefined; readonly release: () => void } {
  const present = signals.filter(
    (signal): signal is AbortSignal => signal !== undefined
  )
  const [first, ...rest] = present
  if (first === undefined)
    return { signal: undefined, release: RELEASE_NOTHING }
  if (rest.length === 0) return { signal: first, release: RELEASE_NOTHING }
  return anySignal({ signals: [first, ...rest] })
}

/**
 * `AbortSignal.any`, which landed in Node 20.3.0. `engines` says `>=20`, so
 * 20.0–20.2 get the listener-based equivalent (and a `release` to detach it)
 * instead of a TypeError at runtime.
 */
export function anySignal({
  signals,
}: {
  readonly signals: readonly [AbortSignal, ...Array<AbortSignal>]
}): { readonly signal: AbortSignal; readonly release: () => void } {
  if (typeof AbortSignal.any === 'function') {
    return { signal: AbortSignal.any([...signals]), release: RELEASE_NOTHING }
  }

  const controller = new AbortController()
  const alreadyAborted = signals.find((signal) => signal.aborted)
  if (alreadyAborted !== undefined) {
    controller.abort(alreadyAborted.reason)
    return { signal: controller.signal, release: RELEASE_NOTHING }
  }

  const listeners = signals.map((source) => {
    const onAbort = (): void => {
      controller.abort(source.reason)
    }
    source.addEventListener('abort', onAbort, { once: true })
    return { source, onAbort }
  })
  return {
    signal: controller.signal,
    release: () => {
      for (const { source, onAbort } of listeners) {
        source.removeEventListener('abort', onAbort)
      }
    },
  }
}

/**
 * Rethrow the abort reason exactly as the caller gave it. `AbortSignal.reason`
 * is `any` by spec and a caller may `abort('because')`, so this is the one
 * place the SDK throws a value it cannot prove is an `Error` — on purpose:
 * `fetch` rejects with the reason verbatim and consumers compare against it.
 */
export function throwReason({ reason }: { readonly reason: unknown }): never {
  throw reason
}

/**
 * Default sleep: a real `setTimeout`-backed wait that a caller abort ends at
 * once, rejecting with the abort reason. Tests override it via
 * `HttpTuning.sleep` so the retry loop runs at full speed.
 */
export function defaultSleep({
  ms,
  signal,
}: {
  readonly ms: number
  readonly signal: AbortSignal | undefined
}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the caller's reason, verbatim (see throwReason).
      reject(signal.reason)
      return
    }
    const onAbort = (): void => {
      clearTimeout(timer)
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the caller's reason, verbatim (see throwReason).
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
