export type AttemptSignal = {
  readonly signal: AbortSignal
  readonly timeoutSignal: AbortSignal
  readonly discard: () => void
  readonly release?: () => void
}

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
    ...(combined.release === undefined ? {} : { release: combined.release }),
    discard: () => {
      discarded.abort(
        new DOMException(
          'The SDK discarded this response to retry the request.',
          'AbortError'
        )
      )
    },
  }
}

export function combineCallerSignals({
  signals,
}: {
  readonly signals: ReadonlyArray<AbortSignal | undefined>
}): {
  readonly signal: AbortSignal | undefined
  readonly release?: () => void
} {
  const present = signals.filter(
    (signal): signal is AbortSignal => signal !== undefined
  )
  const [first, ...rest] = present
  if (first === undefined) return { signal: undefined }
  if (rest.length === 0) return { signal: first }
  return anySignal({ signals: [first, ...rest] })
}

export function anySignal({
  signals,
}: {
  readonly signals: readonly [AbortSignal, ...Array<AbortSignal>]
}): { readonly signal: AbortSignal; readonly release?: () => void } {
  if (typeof AbortSignal.any === 'function') {
    return { signal: AbortSignal.any([...signals]) }
  }

  const controller = new AbortController()
  const alreadyAborted = signals.find((signal) => signal.aborted)
  if (alreadyAborted !== undefined) {
    controller.abort(alreadyAborted.reason)
    return { signal: controller.signal }
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

export function throwReason({ reason }: { readonly reason: unknown }): never {
  throw reason
}

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
