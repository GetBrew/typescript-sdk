import { describe, expect, it, vi } from 'vitest'
import { createBrewClient } from '../src/client'

function requestUrl(input: Parameters<typeof globalThis.fetch>[0]): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

describe('canvas session resource', () => {
  it('preserves the revocation response and raw response metadata', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ revoked: true }), {
          status: 200,
          headers: { 'x-request-id': 'req_revoke' },
        })
      )
    )
    const brew = createBrewClient({ apiKey: 'brew_test', fetch })
    expect(await brew.canvas.sessions.revoke('session_a')).toEqual({
      revoked: true,
    })
    expect(
      await brew.canvas.sessions.revoke('session_a', { raw: true })
    ).toMatchObject({
      data: { revoked: true },
      status: 200,
      requestId: 'req_revoke',
    })
  })

  it.each(['create', 'refresh'] as const)(
    'does not retry or attach a replay key to %s credentials',
    async (method) => {
      const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: { code: 'INTERNAL_ERROR', message: 'Unavailable' },
            }),
            { status: 503 }
          )
        )
      )
      const brew = createBrewClient({
        apiKey: 'brew_test',
        fetch,
        maxRetries: 3,
      })
      const call =
        method === 'create'
          ? brew.canvas.sessions.create({
              target: { type: 'email', emailId: 'email_a' },
              user: { externalId: 'u', name: 'Ada' },
              parentOrigin: 'https://customer.example',
            })
          : brew.canvas.sessions.refresh('session_a')
      await expect(call).rejects.toMatchObject({ status: 503 })
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(
        new Headers(fetch.mock.calls[0]?.[1]?.headers).has('Idempotency-Key')
      ).toBe(false)
    }
  )

  it('creates scoped credentials without replay or automatic retries', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ sessionId: 'session_a' }))
      )
    const brew = createBrewClient({ apiKey: 'brew_test', fetch })
    const target = { type: 'email' as const, emailId: 'email_a' }
    await brew.canvas.sessions.create({
      target,
      user: { externalId: 'u', name: 'Ada' },
      parentOrigin: 'https://customer.example',
    })
    const [url, init] = fetch.mock.calls[0]!
    expect(requestUrl(url)).toContain('/v1/canvas/sessions')
    expect(new Headers(init?.headers).has('Idempotency-Key')).toBe(false)
    if (typeof init?.body !== 'string')
      throw new Error('Expected a JSON request body')
    const body: unknown = JSON.parse(init.body)
    expect(body).toMatchObject({ target })
  })
  it('uses positional identifiers for refresh and revoke', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(() => Promise.resolve(new Response('{}')))
    const brew = createBrewClient({ apiKey: 'brew_test', fetch })
    await brew.canvas.sessions.refresh('session_a')
    await brew.canvas.sessions.revoke('session_a')
    expect(requestUrl(fetch.mock.calls[0]![0])).toContain(
      '/canvas/sessions/session_a/refresh'
    )
    expect(fetch.mock.calls[1]![1]?.method).toBe('DELETE')
  })
})
