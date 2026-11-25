import { throwReason } from './signals'

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
    reader.cancel(signal.reason).catch(() => {})
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

    if (wasAborted) throwReason({ reason: signal.reason })
    return text
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}

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
    cancelled = body.cancel(reason).catch(() => {})
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
