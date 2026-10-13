import {
  BrewEmbedError,
  CANVAS_PROTOCOL,
  isCanvasFrameMessage,
  isCanvasSession,
  resolveCanvasTarget,
  sameCanvasTarget,
  type CanvasCommand,
  type CanvasFrameMessage,
  type CanvasHostMessage,
  type CanvasSavedEvent,
  type CanvasSession,
  type CanvasTarget,
  type CanvasTargetProps,
} from './contracts'

export type CanvasSessionRequest = Readonly<{
  target: CanvasTarget
  sessionId?: string
  signal: AbortSignal
}>
export type EmailCanvasOptions = CanvasTargetProps & {
  readonly getSession: (request: CanvasSessionRequest) => Promise<CanvasSession>
  /** Trusted Brew hosting origin. Override only for your development/preview deployment. */
  readonly embedOrigin?: string
  readonly title?: string
  readonly commandTimeoutMs?: number
  readonly onReady?: () => void
  readonly onSaved?: (event: CanvasSavedEvent) => void
  readonly onSelectionChange?: (emailIds: ReadonlyArray<string>) => void
  readonly onDirtyChange?: (hasUnsavedEdits: boolean) => void
  readonly onError?: (error: BrewEmbedError) => void
}
export type EmailCanvasController = Readonly<{
  fitView: () => Promise<void>
  focusEmail: (emailId: string) => Promise<void>
  flush: () => Promise<void>
  destroy: () => void
}>
type PendingCommand = {
  resolve: () => void
  reject: (error: BrewEmbedError) => void
  timer: ReturnType<typeof setTimeout>
}

/** Creates one isolated iframe. No browser globals are accessed until this function is called. */
export function createEmailCanvas(
  container: HTMLElement,
  options: EmailCanvasOptions
): EmailCanvasController {
  const target = resolveCanvasTarget(options)
  const view = container.ownerDocument.defaultView
  if (!view)
    throw new BrewEmbedError(
      'INVALID_ARGUMENT',
      'Canvas requires a document with a window.'
    )
  const ownerWindow = view
  let origin: string
  try {
    const url = new URL(options.embedOrigin ?? 'https://brew.new')
    if (
      url.origin !== (options.embedOrigin ?? 'https://brew.new') ||
      !['https:', 'http:'].includes(url.protocol)
    ) {
      throw new BrewEmbedError(
        'INVALID_ARGUMENT',
        'embedOrigin must be an exact HTTP or HTTPS origin.'
      )
    }
    origin = url.origin
  } catch {
    throw new BrewEmbedError(
      'INVALID_ARGUMENT',
      'embedOrigin must be an exact HTTP or HTTPS origin.'
    )
  }
  const instanceId = ownerWindow.crypto.randomUUID()
  const abort = new AbortController()
  const pending = new Map<string, PendingCommand>()
  let iframe: HTMLIFrameElement | null = null
  let session: CanvasSession | null = null
  let isDestroyed = false
  let isReady = false
  let isRefreshing = false
  let acquiredAt = 0
  const connectionTimer = setTimeout(() => {
    if (!isReady && !isDestroyed) {
      abort.abort()
      report(
        new BrewEmbedError(
          'CONNECTION_FAILED',
          'Canvas connection timed out. Reopen the canvas to retry.'
        )
      )
    }
  }, 120_000)

  function report(error: BrewEmbedError): void {
    clearTimeout(connectionTimer)
    options.onError?.(error)
  }
  function post(message: CanvasHostMessage): void {
    iframe?.contentWindow?.postMessage(message, origin)
  }
  function authenticate(): void {
    // Cold app compilation or a slow network can outlive the one-minute
    // bootstrap grant. Renew it before transferring an expired credential.
    if (session && Date.now() - acquiredAt >= 45_000) {
      void getSession(true)
      return
    }
    if (session)
      post({
        protocol: CANVAS_PROTOCOL,
        instanceId,
        type: 'authenticate',
        bootstrapToken: session.bootstrapToken,
      })
  }
  async function getSession(isRenewal: boolean): Promise<void> {
    if (isRefreshing || isDestroyed) return
    isRefreshing = true
    try {
      const next = await options.getSession({
        target,
        signal: abort.signal,
        ...(session ? { sessionId: session.sessionId } : {}),
      })
      if (isDestroyed || abort.signal.aborted) return
      if (
        !isCanvasSession(next) ||
        !sameCanvasTarget(next.target, target) ||
        Date.parse(next.expiresAt) <= Date.now()
      ) {
        throw new BrewEmbedError(
          'AUTHENTICATION_FAILED',
          'The canvas session does not authorize the requested target.'
        )
      }
      const url = new URL(next.embedUrl)
      if (
        url.origin !== origin ||
        url.pathname !==
          `/embed/canvas/${encodeURIComponent(next.sessionId)}` ||
        url.username ||
        url.password ||
        url.hash ||
        url.search
      ) {
        throw new BrewEmbedError(
          'AUTHENTICATION_FAILED',
          'The canvas session has an unexpected hosting URL.'
        )
      }
      if (isRenewal && next.sessionId !== session?.sessionId) {
        throw new BrewEmbedError(
          'AUTHENTICATION_FAILED',
          'Refresh must retain the same canvas session.'
        )
      }
      session = next
      acquiredAt = Date.now()
      if (isRenewal) {
        authenticate()
        return
      }
      url.searchParams.set('instanceId', instanceId)
      iframe = container.ownerDocument.createElement('iframe')
      iframe.title = options.title ?? 'Email canvas'
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin')
      iframe.setAttribute('allow', 'clipboard-write')
      iframe.referrerPolicy = 'no-referrer'
      iframe.style.cssText = 'width:100%;height:100%;border:0;display:block;'
      iframe.src = url.href
      container.append(iframe)
    } catch (error) {
      if (!isDestroyed && !abort.signal.aborted)
        report(
          error instanceof BrewEmbedError
            ? error
            : new BrewEmbedError(
                'AUTHENTICATION_FAILED',
                'Could not obtain canvas access.'
              )
        )
    } finally {
      isRefreshing = false
    }
  }
  function handleMessage(event: MessageEvent<unknown>): void {
    if (
      isDestroyed ||
      !iframe ||
      event.origin !== origin ||
      event.source !== iframe.contentWindow ||
      !isCanvasFrameMessage(event.data) ||
      event.data.instanceId !== instanceId
    )
      return
    const message: CanvasFrameMessage = event.data
    switch (message.type) {
      case 'handshake':
        authenticate()
        break
      case 'renew':
        void getSession(true)
        break
      case 'ready':
        clearTimeout(connectionTimer)
        isReady = true
        options.onReady?.()
        break
      case 'saved':
        options.onSaved?.(message.saved)
        break
      case 'selection':
        options.onSelectionChange?.(message.emailIds)
        break
      case 'dirty':
        options.onDirtyChange?.(message.hasUnsavedEdits)
        break
      case 'error':
        isReady = false
        report(new BrewEmbedError(message.code, message.message))
        break
      case 'result': {
        const command = pending.get(message.requestId)
        if (!command) return
        clearTimeout(command.timer)
        pending.delete(message.requestId)
        if (message.error)
          command.reject(new BrewEmbedError('COMMAND_FAILED', message.error))
        else command.resolve()
        break
      }
    }
  }
  function command(command: CanvasCommand): Promise<void> {
    if (isDestroyed)
      return Promise.reject(
        new BrewEmbedError('DESTROYED', 'This canvas has been destroyed.')
      )
    if (!isReady)
      return Promise.reject(
        new BrewEmbedError('CONNECTION_FAILED', 'The canvas is not ready.')
      )
    const requestId = ownerWindow.crypto.randomUUID()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId)
        reject(
          new BrewEmbedError('COMMAND_FAILED', 'Canvas command timed out.')
        )
      }, options.commandTimeoutMs ?? 30_000)
      pending.set(requestId, { resolve, reject, timer })
      post({
        protocol: CANVAS_PROTOCOL,
        instanceId,
        type: 'command',
        requestId,
        command,
      })
    })
  }
  ownerWindow.addEventListener('message', handleMessage)
  void getSession(false)
  return {
    fitView: () => command({ type: 'fit' }),
    focusEmail: (emailId) => command({ type: 'focus', emailId }),
    flush: () => command({ type: 'flush' }),
    destroy: () => {
      if (isDestroyed) return
      isDestroyed = true
      abort.abort()
      clearTimeout(connectionTimer)
      ownerWindow.removeEventListener('message', handleMessage)
      iframe?.remove()
      session = null
      for (const entry of pending.values()) {
        clearTimeout(entry.timer)
        entry.reject(
          new BrewEmbedError('DESTROYED', 'This canvas has been destroyed.')
        )
      }
      pending.clear()
    },
  }
}
