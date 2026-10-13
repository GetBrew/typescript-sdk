import { describe, expect, it, vi } from 'vitest'

import { brewAuthEmails } from '../../src/adapters/better-auth'
import { BrewApiError } from '../../src/index'

import {
  apiError,
  captureFires,
  expectedIdempotencyKey,
  testClient,
} from './helpers'

const user = { id: 'usr_1', email: 'jane@example.com', name: 'Jane' }

describe('@brew.new/sdk/better-auth brewAuthEmails', () => {
  it('sends each callback to its starter-kit key with the shared payload', async () => {
    const fires = captureFires()
    const emails = brewAuthEmails({ client: testClient(), appName: 'Acme' })

    await emails.sendVerificationEmail({
      user,
      url: 'https://app.test/verify?t=v1',
      token: 'v1',
    })
    await emails.sendResetPassword({
      user,
      url: 'https://app.test/reset?t=r1',
      token: 'r1',
    })
    await emails.sendChangeEmailConfirmation({
      user,
      newEmail: 'jane@new.example.com',
      url: 'https://app.test/change?t=c1',
      token: 'c1',
    })
    await emails.sendMagicLink({
      email: 'joe@example.com',
      url: 'https://app.test/magic?t=m1',
      token: 'm1',
    })
    await emails.sendVerificationOTP({
      email: 'joe@example.com',
      otp: '123456',
      type: 'sign-in',
    })
    await emails.onUserCreated(user)

    expect(fires.map(({ key, payload }) => ({ key, payload }))).toEqual([
      {
        key: 'auth.verify-email',
        payload: {
          email: 'jane@example.com',
          appName: 'Acme',
          userName: 'Jane',
          confirmationUrl: 'https://app.test/verify?t=v1',
        },
      },
      {
        key: 'auth.password-reset',
        payload: {
          email: 'jane@example.com',
          appName: 'Acme',
          userName: 'Jane',
          confirmationUrl: 'https://app.test/reset?t=r1',
        },
      },
      {
        // To the CURRENT address: Better Auth asks it to approve the change.
        key: 'auth.email-change',
        payload: {
          email: 'jane@example.com',
          appName: 'Acme',
          userName: 'Jane',
          newEmail: 'jane@new.example.com',
          confirmationUrl: 'https://app.test/change?t=c1',
        },
      },
      {
        key: 'auth.magic-link',
        payload: {
          email: 'joe@example.com',
          appName: 'Acme',
          confirmationUrl: 'https://app.test/magic?t=m1',
        },
      },
      {
        key: 'auth.otp',
        payload: {
          email: 'joe@example.com',
          appName: 'Acme',
          otp: '123456',
          purpose: 'sign-in',
        },
      },
      {
        key: 'lifecycle.welcome',
        payload: {
          email: 'jane@example.com',
          appName: 'Acme',
          userName: 'Jane',
        },
      },
    ])
  })

  it('leaves appName out when it is not set, and userName when the user has none', async () => {
    const fires = captureFires()

    await brewAuthEmails({ client: testClient() }).sendResetPassword({
      user: { email: 'jane@example.com', name: null },
      url: 'https://app.test/reset',
      token: 'r2',
    })

    expect(fires[0]?.payload).toEqual({
      email: 'jane@example.com',
      confirmationUrl: 'https://app.test/reset',
    })
  })

  it('routes an email-OTP `change-email` code to auth.email-change at the new address', async () => {
    const fires = captureFires()

    await brewAuthEmails({ client: testClient() }).sendVerificationOTP({
      email: 'jane@new.example.com',
      otp: '654321',
      type: 'change-email',
    })

    expect(fires).toEqual([
      {
        key: 'auth.email-change',
        payload: {
          email: 'jane@new.example.com',
          newEmail: 'jane@new.example.com',
          otp: '654321',
        },
        idempotencyKey: expectedIdempotencyKey(
          'auth.email-change',
          'jane@new.example.com',
          'change-email',
          '654321'
        ),
      },
    ])
  })

  it('derives each idempotency key from the secret: `${key}:${sha256(token)}`', async () => {
    const fires = captureFires()
    const emails = brewAuthEmails({ client: testClient() })

    await emails.sendMagicLink({
      email: 'a@example.com',
      url: 'u',
      token: 'tok_1',
    })
    // A retried callback carries the same token: same key, so Brew replays.
    await emails.sendMagicLink({
      email: 'a@example.com',
      url: 'u',
      token: 'tok_1',
    })
    await emails.sendVerificationOTP({
      email: 'a@example.com',
      otp: '111111',
      type: 'sign-in',
    })
    await emails.sendVerificationOTP({
      email: 'b@example.com',
      otp: '111111',
      type: 'sign-in',
    })
    await emails.onUserCreated(user)

    expect(fires.map((fire) => fire.idempotencyKey)).toEqual([
      expectedIdempotencyKey('auth.magic-link', 'tok_1'),
      expectedIdempotencyKey('auth.magic-link', 'tok_1'),
      // Two users' equal codes must not replay each other.
      expectedIdempotencyKey('auth.otp', 'a@example.com', 'sign-in', '111111'),
      expectedIdempotencyKey('auth.otp', 'b@example.com', 'sign-in', '111111'),
      expectedIdempotencyKey('lifecycle.welcome', 'usr_1'),
    ])
    // The token itself never leaves the process.
    expect(JSON.stringify(fires)).not.toContain('tok_1')
  })

  it('keeps the idempotency key within the API limit for a long custom key', async () => {
    const fires = captureFires()
    const longKey = `acme.${'x'.repeat(59)}`

    await brewAuthEmails({
      client: testClient(),
      keys: { passwordReset: longKey },
    }).sendResetPassword({ user, url: 'u', token: 'r3' })

    expect(fires[0]?.key).toBe(longKey)
    expect(fires[0]?.idempotencyKey).toHaveLength(100)
    expect(
      expectedIdempotencyKey(longKey, 'r3').startsWith(
        fires[0]?.idempotencyKey ?? '-'
      )
    ).toBe(true)
  })

  it('sends to the keys you name instead of the starter kit', async () => {
    const fires = captureFires()

    await brewAuthEmails({
      client: testClient(),
      keys: { verifyEmail: 'acme.verify', welcome: 'acme.hello' },
    }).sendVerificationEmail({ user, url: 'u', token: 'v2' })

    expect(fires[0]?.key).toBe('acme.verify')
  })

  it('without waitUntil, returns the send: it resolves once Brew accepted and rejects on failure', async () => {
    captureFires(() => apiError(422, 'NO_PUBLISHED_AUTOMATION'))
    const onError = vi.fn()
    const emails = brewAuthEmails({ client: testClient(), onError })

    const error: unknown = await emails
      .sendResetPassword({ user, url: 'u', token: 'r4' })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(BrewApiError)
    expect(onError).toHaveBeenCalledWith(error, {
      key: 'auth.password-reset',
      kind: 'passwordReset',
    })
  })

  it('never rejects onUserCreated: a failed welcome must not fail the sign-up', async () => {
    captureFires(() => apiError(404, 'TRIGGER_KEY_NOT_FOUND', 'not_found'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      brewAuthEmails({ client: testClient() }).onUserCreated(user)
    ).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalledWith(
      '[@brew.new/sdk/better-auth] lifecycle.welcome failed',
      expect.any(BrewApiError)
    )
  })

  it('with waitUntil, hands the send over and returns before Brew answers', async () => {
    let release: () => void = () => {}
    const answered = new Promise<void>((resolve) => {
      release = resolve
    })
    const fires = captureFires()
    const handed: Array<Promise<unknown>> = []
    const client = testClient()
    const send = client.send
    const slowClient = {
      ...client,
      send: (async (...args: Parameters<typeof send>) => {
        await answered
        return send(...args)
      }) as typeof send,
    }

    await brewAuthEmails({
      client: slowClient,
      waitUntil: (promise) => handed.push(promise),
    }).sendMagicLink({ email: 'a@example.com', url: 'u', token: 'm2' })

    expect(handed).toHaveLength(1)
    expect(fires).toHaveLength(0)
    release()
    await handed[0]
    expect(fires).toHaveLength(1)
  })

  it('with waitUntil, a failed send goes to onError (console.error by default) and never rejects', async () => {
    captureFires(() => apiError(500, 'INTERNAL_ERROR', 'server'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const handed: Array<Promise<unknown>> = []

    await brewAuthEmails({
      client: testClient(),
      waitUntil: (promise) => handed.push(promise),
    }).sendVerificationEmail({ user, url: 'u', token: 'v3' })

    await expect(handed[0]).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalledWith(
      '[@brew.new/sdk/better-auth] auth.verify-email failed',
      expect.any(BrewApiError)
    )
  })

  it('builds the client from a factory once, on the first send', async () => {
    captureFires()
    const factory = vi.fn(testClient)
    const emails = brewAuthEmails({ client: factory })

    expect(factory).not.toHaveBeenCalled()
    await emails.sendMagicLink({
      email: 'a@example.com',
      url: 'u',
      token: 'm3',
    })
    await emails.sendMagicLink({
      email: 'b@example.com',
      url: 'u',
      token: 'm4',
    })
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('turns a factory that throws into a rejected send, not a thrown callback', async () => {
    const emails = brewAuthEmails({
      client: () => {
        throw new TypeError('BREW_API_KEY is not set')
      },
    })

    const sending = emails.sendMagicLink({
      email: 'a@example.com',
      url: 'u',
      token: 'm5',
    })

    await expect(sending).rejects.toThrow('BREW_API_KEY is not set')
  })
})
