import { describe, expect, it, vi } from 'vitest'
import { createCanvasSessionProvider } from '../src/embed/session-provider'

describe('host session provider', () => {
  it('posts the target and renewal identity without serializing the abort signal', async () => {
    const session = {
      sessionId: 'session_a',
      target: { type: 'email', emailId: 'email_a' },
      embedUrl: 'https://brew.new/embed/canvas/session_a',
      bootstrapToken: 'secret',
      expiresAt: Date.now() + 60000,
    }
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
