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
  await bridge.close()
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
  expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
    method: 'DELETE',
    keepalive: true,
  })
})
