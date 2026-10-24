import { describe, expect, it, vi } from 'vitest'
import { createClientCanvasSessionProvider } from '../src/embed/client-session'

const grant = {
  sessionId: 'session_client',
  target: { type: 'group' as const, groupId: 'grp_a' },
  embedUrl: 'https://brew.new/embed/canvas/session_client',
  bootstrapToken: 'bootstrap',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
}
const clientId = 'brew_client_0123456789abcdef0123456789abcdef'

describe('client ID session transport', () => {
  it('carries the selected brand for an all-brands client ID, including ungrouped targets', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(grant))
    const provider = createClientCanvasSessionProvider({
      clientId,
      brandId: 'brand_a',
      embedOrigin: 'https://brew.new',
      fetch: fetcher,
    })
    await provider.getSession({
      target: { type: 'group', groupId: 'ungrouped' },
      signal: new AbortController().signal,
    })
    const body = fetcher.mock.calls[0]?.[1]?.body
    expect(
      JSON.parse(typeof body === 'string' ? body : '') as Record<
        string,
        unknown
      >
    ).toMatchObject({
      brandId: 'brand_a',
      target: { type: 'group', groupId: 'ungrouped' },
    })
    await provider.close()
  })
  it('authenticates using only a client ID, target and internally generated ownership token; renews in place', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(Response.json(grant)))
    const provider = createClientCanvasSessionProvider({
      clientId,
      embedOrigin: 'https://brew.new',
      fetch: fetcher,
    })
    const request = {
      target: grant.target,
      signal: new AbortController().signal,
    }
    await expect(provider.getSession(request)).resolves.toEqual(grant)
    await provider.getSession({ ...request, sessionId: grant.sessionId })
    const [url, init] = fetcher.mock.calls[0]!
    expect(url).toBe(
      `https://brew.new/api/embed/canvas/clients/${clientId}/sessions`
    )
    expect(init?.credentials).toBe('omit')
    const body = JSON.parse(
      typeof init?.body === 'string' ? init.body : ''
    ) as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual([
      'clientSessionToken',
      'recoveryId',
      'target',
    ])
    expect(body.clientSessionToken).toMatch(/^[0-9a-f]{64}$/)
    const renewal = JSON.parse(
      typeof fetcher.mock.calls[1]![1]?.body === 'string'
        ? fetcher.mock.calls[1]![1].body
        : ''
    ) as Record<string, unknown>
    expect(renewal.clientSessionToken).toBe(body.clientSessionToken)
    expect(renewal.sessionId).toBe(grant.sessionId)
    await provider.close()
    expect(fetcher.mock.calls.at(-1)?.[1]?.method).toBe('DELETE')
  })
  it('drains a pending create and revokes it when unmounted before the response', async () => {
    let resolveCreate: (response: Response) => void = () => {}
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveCreate = resolve
          })
      )
      .mockResolvedValue(new Response(null, { status: 204 }))
    const provider = createClientCanvasSessionProvider({
      clientId,
      embedOrigin: 'https://brew.new',
      fetch: fetcher,
    })
    const pending = provider.getSession({
      target: grant.target,
      signal: new AbortController().signal,
    })
    const assertion = expect(pending).rejects.toMatchObject({
      code: 'DESTROYED',
    })
    const closed = provider.close()
    resolveCreate(Response.json(grant))
    await assertion
    await closed
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls[1]![1]?.method).toBe('DELETE')
  })
  it.each(['', 'brew_secret_key', 'brew_client_not-valid'])(
    'rejects invalid client IDs before networking: %s',
    (value) => {
      expect(() =>
        createClientCanvasSessionProvider({
          clientId: value,
          embedOrigin: 'https://brew.new',
        })
      ).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }))
    }
  )
  it('returns typed errors for rejected or malformed grants', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 403 }))
      .mockResolvedValueOnce(Response.json({ apiKey: 'never-trust-this' }))
    const provider = createClientCanvasSessionProvider({
      clientId,
      embedOrigin: 'https://brew.new',
      fetch: fetcher,
    })
    const request = {
      target: grant.target,
      signal: new AbortController().signal,
    }
    await expect(provider.getSession(request)).rejects.toMatchObject({
      code: 'AUTHENTICATION_FAILED',
    })
    await expect(provider.getSession(request)).rejects.toMatchObject({
      code: 'AUTHENTICATION_FAILED',
    })
    await provider.close()
  })
})
it('reuses a public recovery ID while generating independent ownership secrets on reopen', async () => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  })
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation((_url, options) =>
      options?.method === 'DELETE'
        ? Promise.resolve(new Response(null, { status: 204 }))
        : Promise.resolve(Response.json(grant))
    )
  const one = createClientCanvasSessionProvider({
    clientId,
    embedOrigin: 'https://brew.new',
    fetch: fetcher,
  })
  const two = createClientCanvasSessionProvider({
    clientId,
    embedOrigin: 'https://brew.new',
    fetch: fetcher,
  })
  try {
    const request = {
      target: grant.target,
      signal: new AbortController().signal,
    }
    await one.getSession(request)
    await two.getSession(request)
    const bodies = fetcher.mock.calls.map(([, options]) => {
      if (typeof options?.body !== 'string')
        throw new Error('Expected a JSON body')
      return JSON.parse(options.body) as Record<string, unknown>
    })
    expect(bodies[0]?.recoveryId).toMatch(/^[0-9a-f-]{36}$/)
    expect(bodies[0]?.recoveryId).toBe(bodies[1]?.recoveryId)
    expect(bodies[0]?.clientSessionToken).not.toBe(
      bodies[1]?.clientSessionToken
    )
  } finally {
    await Promise.all([one.close(), two.close()])
    vi.unstubAllGlobals()
  }
})
