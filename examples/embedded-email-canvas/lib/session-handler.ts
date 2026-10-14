import { createHmac, timingSafeEqual } from 'node:crypto'
import type { createBrewClient } from '@brew.new/sdk'
import {
  type CanvasTarget,
  isCanvasTarget,
  sameCanvasTarget,
} from '@brew.new/sdk/embed'
import type { DemoConfig } from './config'

export type HostIdentity = Readonly<{
  userId: string
  loginSessionId: string
  name: string
}>
type SdkSessions = ReturnType<typeof createBrewClient>['canvas']['sessions']
// The host uses the SDK's ordinary result overload, not its raw HTTP response.
type Sessions = {
  readonly [Method in keyof SdkSessions]: (
    ...args: Parameters<SdkSessions[Method]>
  ) => ReturnType<SdkSessions[Method]>
}
type Dependencies = Readonly<{
  config: DemoConfig
  authenticate: () => Promise<HostIdentity | null>
  sessions: Sessions
}>

function reply(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', Vary: 'Cookie, Origin' },
  })
}

function ownershipProof(
  config: DemoConfig,
  identity: HostIdentity,
  sessionId: string,
  target: CanvasTarget
): string {
  // A signed receipt proves issuance; Clerk still authenticates every request.
  return createHmac('sha256', config.sessionSecret)
    .update(
      JSON.stringify([
        1,
        identity.userId,
        identity.loginSessionId,
        config.brandId,
        config.appOrigin,
        sessionId,
        target,
        config.canEdit,
      ])
    )
    .digest('hex')
}

function hasProof(received: string | null, expected: string): boolean {
  if (!received || !/^[a-f0-9]{64}$/.test(received)) {
    return false
  }
  return timingSafeEqual(
    Buffer.from(received, 'hex'),
    Buffer.from(expected, 'hex')
  )
}

/** Shared by Next and the hermetic browser fixture; no alternate production auth path. */
export async function handleSession(
  request: Request,
  { config, authenticate, sessions }: Dependencies
): Promise<Response> {
  if (!['POST', 'DELETE'].includes(request.method)) {
    return reply({ error: 'Method not allowed.' }, 405)
  }
  if (
    request.headers.get('origin') !== config.appOrigin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    return reply({ error: 'Untrusted request origin.' }, 403)
  }
  if (
    request.headers.get('content-type')?.split(';')[0]?.trim() !==
    'application/json'
  ) {
    return reply({ error: 'Send application/json.' }, 415)
  }
  const identity = await authenticate()
  if (!identity) {
    return reply({ error: 'Sign in to open a canvas.' }, 401)
  }
  if (!config.allowedUserIds.includes(identity.userId)) {
    return reply({ error: 'Ask the app owner to grant access.' }, 403)
  }
  const reader = request.body?.getReader()
  const decoder = new TextDecoder()
  let raw = ''
  let bytes = 0
  if (reader) {
    while (true) {
      // biome-ignore lint/performance/noAwaitInLoops: consume the stream in order and stop at the byte limit
      const chunk = await reader.read()
      if (chunk.done) {
        break
      }
      bytes += chunk.value.byteLength
      if (bytes > 2048) {
        await reader.cancel()
        return reply({ error: 'Request too large.' }, 413)
      }
      raw += decoder.decode(chunk.value, { stream: true })
    }
    raw += decoder.decode()
  }
  let input: unknown
  try {
    input = JSON.parse(raw)
  } catch {
    return reply({ error: 'Invalid JSON.' }, 400)
  }
  if (!input || typeof input !== 'object' || !('target' in input)) {
    return reply({ error: 'Choose an approved target.' }, 400)
  }
  // Resolve to a canonical, server-owned object before signing or calling Brew.
  const requested = input.target
  if (!isCanvasTarget(requested)) {
    return reply({ error: 'Choose a valid target.' }, 400)
  }
  const approved = config.targets.find(({ target }) =>
    sameCanvasTarget(target, requested)
  )
  if (!approved) {
    return reply({ error: 'Target not authorized.' }, 403)
  }
  const target = approved.target
  const sessionId = 'sessionId' in input ? input.sessionId : undefined
  if (
    sessionId !== undefined &&
    (typeof sessionId !== 'string' || !sessionId || sessionId.length > 200)
  ) {
    return reply({ error: 'Invalid session ID.' }, 400)
  }
  if (request.method === 'DELETE' && !sessionId) {
    return reply({ error: 'A session ID is required.' }, 400)
  }
  if (typeof sessionId === 'string') {
    const receipt = request.headers.get('x-canvas-owner')
    const isCurrent = hasProof(
      receipt,
      ownershipProof(config, identity, sessionId, target)
    )
    const canRevokePreviousPolicy =
      request.method === 'DELETE' &&
      hasProof(
        receipt,
        ownershipProof(
          { ...config, canEdit: !config.canEdit },
          identity,
          sessionId,
          target
        )
      )
    if (!isCurrent && !canRevokePreviousPolicy) {
      return reply(
        {
          error:
            'Session not owned by this sign-in, or its permissions changed. Reopen the canvas.',
        },
        403
      )
    }
  }
  try {
    if (request.method === 'DELETE' && typeof sessionId === 'string') {
      await sessions.revoke(sessionId)
      return new Response(null, {
        status: 204,
        headers: { 'Cache-Control': 'no-store' },
      })
    }
    const grant =
      typeof sessionId === 'string'
        ? await sessions.refresh(sessionId)
        : await sessions.create({
            target,
            parentOrigin: config.appOrigin,
            user: { externalId: identity.userId, name: identity.name },
            permissions: config.canEdit
              ? ['read', 'edit', 'presence']
              : ['read', 'presence'],
          })
    if (
      !sameCanvasTarget(grant.target, target) ||
      (sessionId && grant.sessionId !== sessionId) ||
      new URL(grant.embedUrl).origin !== config.embedOrigin
    ) {
      return reply(
        {
          error:
            'Brew returned an unexpected canvas. Check the configured origin.',
        },
        502
      )
    }
    return reply({
      ...grant,
      ownershipToken: ownershipProof(config, identity, grant.sessionId, target),
    })
  } catch {
    // Never forward upstream responses containing credentials to the browser.
    return reply(
      {
        error:
          'Could not authorize the canvas. Check the Brew key, brand, and target.',
      },
      502
    )
  }
}
