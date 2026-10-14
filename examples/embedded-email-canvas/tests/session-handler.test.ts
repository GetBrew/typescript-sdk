import type {
  CanvasSession,
  CreateCanvasSessionInput,
} from '@brew.new/sdk/embed'
import { describe, expect, it, vi } from 'vitest'
import { readConfig } from '../lib/config'
import { type HostIdentity, handleSession } from '../lib/session-handler'

const env = {
  APP_ORIGIN: 'http://localhost:3500',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'test',
  CLERK_SECRET_KEY: 'test',
  DEMO_ALLOWED_USER_IDS: 'alice,bob',
  CANVAS_SESSION_SECRET: 'a'.repeat(64),
  BREW_API_KEY: 'synthetic',
  BREW_BRAND_ID: 'brand',
  BREW_GROUP_ID: 'group',
  BREW_EMAIL_ID: 'email',
  BREW_EMBED_ORIGIN: 'https://brew.new',
}
const target = { type: 'group', groupId: 'group' } as const
const grant: CanvasSession = {
  sessionId: 'session',
  target,
  embedUrl: 'https://brew.new/embed/canvas/session',
  bootstrapToken: 'one-use',
  expiresAt: '2099-01-01T00:00:00.000Z',
}
function setup(
  identity: HostIdentity | null = {
    userId: 'alice',
    loginSessionId: 'login-1',
    name: 'Alice',
  }
) {
  const sessions = {
    create: vi.fn<(input: CreateCanvasSessionInput) => Promise<CanvasSession>>(
      async () => grant
    ),
    refresh: vi.fn(async () => grant),
    revoke: vi.fn(async () => undefined),
  }
  return {
    config: readConfig(env),
    authenticate: vi.fn(async () => identity),
    sessions,
  }
}
function request(
  body: unknown,
  proof?: string,
  method = 'POST',
  origin = env.APP_ORIGIN
) {
  return new Request(`${env.APP_ORIGIN}/api/canvas-session`, {
    method,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...(proof ? { 'X-Canvas-Owner': proof } : {}),
    },
    body: JSON.stringify(body),
  })
}
async function create(deps: ReturnType<typeof setup>) {
  const response = await handleSession(request({ target }), deps)
  expect(response.status).toBe(200)
  const body: { ownershipToken: string } = await response.json()
  return body.ownershipToken
}
describe('Authenticated host sessions', () => {
  it('pins identity, origin and edit permissions on the server', async () => {
    const deps = setup()
    const response = await handleSession(
      request({
        target,
        user: { externalId: 'mallory' },
        permissions: ['admin'],
      }),
      deps
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(deps.sessions.create).toHaveBeenCalledWith({
      target,
      parentOrigin: env.APP_ORIGIN,
      user: { externalId: 'alice', name: 'Alice' },
      permissions: ['read', 'edit', 'presence'],
    })
  })
  it('rejects anonymous, unapproved and cross-origin callers before contacting Brew', async () => {
    await Promise.all(
      [
        null,
        { userId: 'mallory', loginSessionId: 'login', name: 'Mallory' },
      ].map(async (identity) => {
        const deps = setup(identity)
        expect((await handleSession(request({ target }), deps)).status).toBe(
          identity ? 403 : 401
        )
        expect(deps.sessions.create).not.toHaveBeenCalled()
      })
    )
    const deps = setup()
    expect(
      (
        await handleSession(
          request({ target }, undefined, 'POST', 'https://evil.example'),
          deps
        )
      ).status
    ).toBe(403)
    expect(deps.authenticate).not.toHaveBeenCalled()
  })
  it('cannot mint an arbitrary group or email', async () => {
    const deps = setup()
    expect(
      (
        await handleSession(
          request({ target: { type: 'email', emailId: 'other' } }),
          deps
        )
      ).status
    ).toBe(403)
    expect(deps.sessions.create).not.toHaveBeenCalled()
  })
  it('renews and revokes only a receipt bound to this user, login, target and session', async () => {
    const deps = setup()
    const proof = await create(deps)
    expect(
      (
        await handleSession(
          request({ target, sessionId: 'session' }, proof),
          deps
        )
      ).status
    ).toBe(200)
    expect(deps.sessions.refresh).toHaveBeenCalledWith('session')
    await Promise.all(
      [undefined, 'bad', 'b'.repeat(64)].map(async (bad) => {
        expect(
          (
            await handleSession(
              request({ target, sessionId: 'session' }, bad),
              deps
            )
          ).status
        ).toBe(403)
      })
    )
    const bob = setup({ userId: 'bob', loginSessionId: 'login-1', name: 'Bob' })
    expect(
      (
        await handleSession(
          request({ target, sessionId: 'session' }, proof),
          bob
        )
      ).status
    ).toBe(403)
    const newLogin = setup({
      userId: 'alice',
      loginSessionId: 'login-2',
      name: 'Alice',
    })
    expect(
      (
        await handleSession(
          request({ target, sessionId: 'session' }, proof),
          newLogin
        )
      ).status
    ).toBe(403)
    expect(
      (
        await handleSession(
          request({ target, sessionId: 'stolen' }, proof),
          deps
        )
      ).status
    ).toBe(403)
    expect(
      (
        await handleSession(
          request(
            {
              target: { type: 'email', emailId: 'email' },
              sessionId: 'session',
            },
            proof
          ),
          deps
        )
      ).status
    ).toBe(403)
    expect(
      (
        await handleSession(
          request({ target, sessionId: 'session' }, proof, 'DELETE'),
          deps
        )
      ).status
    ).toBe(204)
    expect(deps.sessions.revoke).toHaveBeenCalledWith('session')
  })
  it('issues read-only access and rejects stale ownership after removing a user', async () => {
    const deps = setup()
    const proof = await create(deps)
    const readonly = {
      ...deps,
      config: readConfig({ ...env, CANVAS_CAN_EDIT: 'false' }),
    }
    expect(
      (
        await handleSession(
          request({ target, sessionId: 'session' }, proof),
          readonly
        )
      ).status
    ).toBe(403)
    expect(
      (
        await handleSession(
          request({ target, sessionId: 'session' }, proof, 'DELETE'),
          readonly
        )
      ).status
    ).toBe(204)
    await handleSession(request({ target }), readonly)
    expect(deps.sessions.create.mock.lastCall?.[0]).toMatchObject({
      permissions: ['read', 'presence'],
    })
    const denied = {
      ...deps,
      config: { ...deps.config, allowedUserIds: ['bob'] },
    }
    expect(
      (
        await handleSession(
          request({ target, sessionId: 'session' }, proof),
          denied
        )
      ).status
    ).toBe(403)
  })
  it('does not forward upstream secrets or unexpected targets', async () => {
    const deps = setup()
    deps.sessions.create.mockRejectedValueOnce(new Error('BREW_API_KEY=secret'))
    const response = await handleSession(request({ target }), deps)
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain('secret')
    deps.sessions.create.mockResolvedValueOnce({
      ...grant,
      target: { type: 'email', emailId: 'other' },
    })
    expect((await handleSession(request({ target }), deps)).status).toBe(502)
  })
  it('rejects malformed and oversized requests', async () => {
    const deps = setup()
    expect(
      (await handleSession(request({ target, sessionId: 42 }), deps)).status
    ).toBe(400)
    expect(
      (
        await handleSession(
          request({ target, padding: 'x'.repeat(2100) }),
          deps
        )
      ).status
    ).toBe(413)
    expect(
      (await handleSession(request({ target }, undefined, 'DELETE'), deps))
        .status
    ).toBe(400)
  })
})
