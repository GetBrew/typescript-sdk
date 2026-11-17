import { describe, expect, it, vi } from 'vitest'
import { createCanvasSessionProvider } from '../src/embed/session-provider'

const session = {
  sessionId: 'session_a',
  target: { type: 'email', emailId: 'email_a' },
  embedUrl: 'https://brew.new/embed/canvas/session_a',
  bootstrapToken: 'secret',
  expiresAt: new Date(Date.now() + 60000).toISOString(),
}

describe('host session provider', () => {
  it('posts the target and renewal identity without serializing the abort signal', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(session))
    const provider = createCanvasSessionProvider('/api/canvas-session', {
      fetch: fetcher,
    })
    const signal = new AbortController().signal
    await expect(
      provider({
        target: { type: 'email', emailId: 'email_a' },
        sessionId: 'session_a',
        signal,
      })
    ).resolves.toEqual(session)
    expect(fetcher).toHaveBeenCalledWith(
      '/api/canvas-session',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        signal,
        body: JSON.stringify({
          target: { type: 'email', emailId: 'email_a' },
          sessionId: 'session_a',
        }),
      })
    )
  })
  it('copies custom headers while preserving the required JSON content type', async () => {
    const headers = new Headers({
      'X-CSRF-Token': 'host-token',
      'Content-Type': 'text/plain',
    })
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(session))
    const provider = createCanvasSessionProvider('/api/canvas-session', {
      fetch: fetcher,
      headers,
    })
    await provider({
      target: { type: 'email', emailId: 'email_a' },
      signal: new AbortController().signal,
    })
    const sent = new Headers(fetcher.mock.calls[0]?.[1]?.headers)
    expect(sent.get('X-CSRF-Token')).toBe('host-token')
    expect(sent.get('Content-Type')).toBe('application/json')
    expect(headers.get('Content-Type')).toBe('text/plain')
  })
  it('reads current async CSRF headers again for each renewal', async () => {
    const headers = vi
      .fn<() => Promise<HeadersInit>>()
      .mockResolvedValueOnce({ 'X-CSRF-Token': 'initial-token' })
      .mockResolvedValueOnce([['X-CSRF-Token', 'renewal-token']])
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(session))
      .mockResolvedValueOnce(Response.json(session))
    const provider = createCanvasSessionProvider('/api/canvas-session', {
      fetch: fetcher,
      headers,
    })
    const request = {
      target: { type: 'email' as const, emailId: 'email_a' },
      signal: new AbortController().signal,
    }
    await provider(request)
    await provider({ ...request, sessionId: 'session_a' })
    expect(headers).toHaveBeenCalledTimes(2)
    expect(
      new Headers(fetcher.mock.calls[0]?.[1]?.headers).get('X-CSRF-Token')
    ).toBe('initial-token')
    expect(
      new Headers(fetcher.mock.calls[1]?.[1]?.headers).get('X-CSRF-Token')
    ).toBe('renewal-token')
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      credentials: 'same-origin',
      signal: request.signal,
    })
  })
  it('reports header resolution failures through the typed connection error', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const provider = createCanvasSessionProvider('/api/canvas-session', {
      fetch: fetcher,
      headers: () => Promise.reject(new Error('private host token failure')),
    })
    await expect(
      provider({
        target: { type: 'email', emailId: 'email_a' },
        signal: new AbortController().signal,
      })
    ).rejects.toMatchObject({
      code: 'CONNECTION_FAILED',
      message: 'Could not connect to your canvas session endpoint.',
    })
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('preserves the caller abort reason when cancellation occurs while resolving headers', async () => {
    const controller = new AbortController()
    const reason = { canceledByHost: true }
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(session))
    const provider = createCanvasSessionProvider('/api/canvas-session', {
      fetch: fetcher,
      headers: () => {
        controller.abort(reason)
        return Promise.resolve({ 'X-CSRF-Token': 'unused-token' })
      },
    })
    await expect(
      provider({
        target: { type: 'email', emailId: 'email_a' },
        signal: controller.signal,
      })
    ).rejects.toBe(reason)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('does not read CSRF headers or fetch for an already canceled request', async () => {
    const controller = new AbortController()
    const reason = new Error('Host closed the editor')
    controller.abort(reason)
    const headers = vi.fn(() => ({ 'X-CSRF-Token': 'unused-token' }))
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(session))
    const provider = createCanvasSessionProvider('/api/canvas-session', {
      fetch: fetcher,
      headers,
    })
    await expect(
      provider({
        target: { type: 'email', emailId: 'email_a' },
        signal: controller.signal,
      })
    ).rejects.toBe(reason)
    expect(headers).not.toHaveBeenCalled()
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('aborts an unresolved header lookup promptly and consumes a later rejection', async () => {
    const controller = new AbortController()
    const reason = { canceledByHost: true }
    let rejectHeaders!: (error: Error) => void
    const headers = vi.fn(
      () =>
        new Promise<HeadersInit>((_resolve, reject) => {
          rejectHeaders = reject
        })
    )
    const fetcher = vi.fn<typeof fetch>()
    const provider = createCanvasSessionProvider('/api/canvas-session', {
      fetch: fetcher,
      headers,
    })
    const pending = provider({
      target: { type: 'email', emailId: 'email_a' },
      signal: controller.signal,
    })
    const assertion = expect(pending).rejects.toBe(reason)
    await Promise.resolve()
    controller.abort(reason)
    await assertion
    expect(fetcher).not.toHaveBeenCalled()
    rejectHeaders(new Error('Header lookup failed after cancellation'))
    await Promise.resolve()
  }, 1000)
  it('preserves the caller abort reason when fetching the session', async () => {
    const controller = new AbortController()
    const reason = new Error('Host closed the editor')
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => {
      controller.abort(reason)
      return Promise.reject(new Error('aborted fetch'))
    })
    const provider = createCanvasSessionProvider('/api/canvas-session', {
      fetch: fetcher,
      headers: { 'X-CSRF-Token': 'host-token' },
    })
    await expect(
      provider({
        target: { type: 'email', emailId: 'email_a' },
        signal: controller.signal,
      })
    ).rejects.toBe(reason)
  })
  it('reports malformed and unsuccessful responses as typed embed errors', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ secret: 'wrong' }))
      .mockResolvedValueOnce(new Response('', { status: 403 }))
    const provider = createCanvasSessionProvider('/api/canvas-session', {
      fetch: fetcher,
    })
    const request = {
      target: { type: 'group' as const, groupId: 'grp_a' },
      signal: new AbortController().signal,
    }
    await expect(provider(request)).rejects.toMatchObject({
      code: 'AUTHENTICATION_FAILED',
    })
    await expect(provider(request)).rejects.toMatchObject({
      code: 'AUTHENTICATION_FAILED',
    })
  })
})
