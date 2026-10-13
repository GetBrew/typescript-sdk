import { describe, expect, it, vi } from 'vitest'
import { createBrewClient } from '../src/client'

function requestUrl(input: Parameters<typeof globalThis.fetch>[0]): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

describe('canvas session resource', () => {
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
