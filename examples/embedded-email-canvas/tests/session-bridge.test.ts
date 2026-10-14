import { expect, it, vi } from 'vitest'
import { createSessionBridge } from '../lib/session-bridge'

it('finishes and revokes a late creation even after iframe cleanup aborts the SDK request', async () => {
  const abort = new AbortController()
  const target = { type: 'group', groupId: 'group' } as const
  let finish: ((response: Response) => void) | undefined
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    if (init?.method === 'DELETE') {
      return new Response(null, { status: 204 })
    }
    return new Promise<Response>((resolve) => {
      finish = resolve
    })
  })
  const bridge = createSessionBridge(target, fetcher)
  const pending = bridge.getSession({ target, signal: abort.signal })
  const closing = bridge.close()
  abort.abort()
  expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(false)
  finish?.(
    Response.json({
      target,
      sessionId: 'session',
      bootstrapToken: 'bootstrap',
      embedUrl: 'https://brew.new/embed/canvas/session',
      expiresAt: '2099-01-01T00:00:00.000Z',
      ownershipToken: 'a'.repeat(64),
    })
  )
  await pending
  await closing
  expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
    method: 'DELETE',
    keepalive: true,
  })
})
const target = { type: 'group', groupId: 'group' } as const
const grant = {
  target,
  sessionId: 'session',
  bootstrapToken: 'bootstrap',
  embedUrl: 'https://brew.new/embed/canvas/session',
  expiresAt: '2099-01-01T00:00:00.000Z',
  ownershipToken: 'a'.repeat(64),
}
it('waits for in-flight issuance and revocation before allowing sign-out', async () => {
  let finish: ((response: Response) => void) | undefined
  const fetcher = vi.fn<typeof fetch>(async (_url, init) =>
    init?.method === 'DELETE'
      ? new Response(null, { status: 204 })
      : new Promise<Response>((resolve) => {
          finish = resolve
        })
  )
  const bridge = createSessionBridge(target, fetcher)
  const pending = bridge.getSession({
    target,
    signal: new AbortController().signal,
  })
  let isClosed = false
  const closing = bridge.close().then(() => {
    isClosed = true
  })
  await new Promise((resolve) => setTimeout(resolve, 0))
  try {
    expect(isClosed).toBe(false)
  } finally {
    finish?.(Response.json(grant))
    await pending
    await closing
  }
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it('keeps renewal usable after a failed exit attempt', async () => {
  const fetcher = vi.fn<typeof fetch>(async (_url, init) =>
    init?.method === 'DELETE'
      ? new Response(null, { status: 503 })
      : Response.json(grant)
  )
  const bridge = createSessionBridge(target, fetcher)
  await bridge.getSession({ target, signal: new AbortController().signal })
  await expect(bridge.close()).rejects.toThrow('Could not close')
  await expect(
    bridge.getSession({
      target,
      sessionId: grant.sessionId,
      signal: new AbortController().signal,
    })
  ).resolves.toMatchObject({ sessionId: grant.sessionId })
  expect(
    fetcher.mock.calls.filter((call) => call[1]?.method === 'DELETE')
  ).toHaveLength(1)
})
