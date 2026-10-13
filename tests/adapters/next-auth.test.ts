import { afterEach, describe, expect, it, vi } from 'vitest'

import * as authJs from '../../src/adapters/next-auth'
import { BrewEmail } from '../../src/adapters/next-auth'
import { BrewApiError } from '../../src/index'

import {
  apiError,
  captureFires,
  expectedIdempotencyKey,
  testClient,
} from './helpers'

afterEach(() => {
  vi.useRealTimers()
})

describe('@brew.new/sdk/next-auth BrewEmail', () => {
  it('is an Auth.js email provider: id brew, type email, name Email, 24 h maxAge', () => {
    const provider = BrewEmail({ client: testClient() })

    expect(provider).toMatchObject({
      id: 'brew',
      type: 'email',
      name: 'Email',
      maxAge: 86_400,
    })
    expect(typeof provider.sendVerificationRequest).toBe('function')
    expect(BrewEmail({ client: testClient(), maxAge: 600 }).maxAge).toBe(600)
    // next-auth v4 types accept only the id `email`.
    expect(BrewEmail({ client: testClient(), id: 'email' }).id).toBe('email')
  })

  it('sends the sign-in link to auth.magic-link and awaits Brew', async () => {
    vi.useFakeTimers({
      now: new Date('2026-10-13T08:00:00.000Z'),
      toFake: ['Date'],
    })
    const fires = captureFires()
    const provider = BrewEmail({
      client: () => testClient(),
      appName: 'Acme',
      maxAge: 30 * 60,
    })

    // Auth.js sets `expires` to now + the provider's `maxAge`.
    await provider.sendVerificationRequest({
      identifier: 'jane@example.com',
      url: 'https://app.test/api/auth/callback/brew?token=tok_1',
      expires: new Date('2026-10-13T08:30:00.000Z'),
      token: 'tok_1',
      provider,
    })

    expect(fires).toEqual([
      {
        key: 'auth.magic-link',
        payload: {
          email: 'jane@example.com',
          appName: 'Acme',
          confirmationUrl:
            'https://app.test/api/auth/callback/brew?token=tok_1',
          expiresInMinutes: 30,
        },
        idempotencyKey: expectedIdempotencyKey('auth.magic-link', 'tok_1'),
      },
    ])
  })

  it('falls back to maxAge for the expiry and the url for the idempotency key', async () => {
    const fires = captureFires()

    await BrewEmail({
      client: testClient(),
      key: 'acme.sign-in',
      maxAge: 15 * 60,
    }).sendVerificationRequest({
      identifier: 'jane@example.com',
      url: 'https://app.test/cb?token=abc',
    })

    expect(fires[0]).toMatchObject({
      key: 'acme.sign-in',
      payload: { expiresInMinutes: 15 },
      idempotencyKey: expectedIdempotencyKey(
        'acme.sign-in',
        'https://app.test/cb?token=abc'
      ),
    })
  })

  it('sends the same body for the same token however late the retry: the expiry is the link lifetime', async () => {
    vi.useFakeTimers({
      now: new Date('2026-10-13T08:00:00.000Z'),
      toFake: ['Date'],
    })
    const fires = captureFires()
    const provider = BrewEmail({ client: testClient(), maxAge: 30 * 60 })
    const request = {
      identifier: 'jane@example.com',
      url: 'https://app.test/api/auth/callback/brew?token=tok_retry',
      expires: new Date('2026-10-13T08:30:00.000Z'),
      token: 'tok_retry',
      provider,
    }

    await provider.sendVerificationRequest(request)
    vi.setSystemTime(new Date('2026-10-13T08:02:45.000Z'))
    await provider.sendVerificationRequest(request)

    // Same key, same body: Brew replays the first send instead of answering
    // IDEMPOTENCY_CONFLICT.
    expect(fires).toHaveLength(2)
    expect(fires[1]).toEqual(fires[0])
    expect(fires[0]?.payload['expiresInMinutes']).toBe(30)
  })

  it('reads the lifetime from the provider Auth.js passes, so a maxAge set over the provider wins', async () => {
    const fires = captureFires()
    const provider = BrewEmail({ client: testClient() })

    await provider.sendVerificationRequest({
      identifier: 'jane@example.com',
      url: 'https://app.test/cb?token=tok_2',
      token: 'tok_2',
      provider: { ...provider, maxAge: 10 * 60 },
    })

    expect(fires[0]?.payload['expiresInMinutes']).toBe(10)
  })

  it('throws when Brew refuses, so Auth.js shows its error page', async () => {
    captureFires(() => apiError(404, 'TRIGGER_KEY_NOT_FOUND', 'not_found'))

    const error: unknown = await BrewEmail({ client: testClient() })
      .sendVerificationRequest({ identifier: 'jane@example.com', url: 'u' })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(BrewApiError)
    expect(error).toMatchObject({ code: 'TRIGGER_KEY_NOT_FOUND' })
  })

  it('exports the provider and its default lifetime', () => {
    expect(Object.keys(authJs).sort()).toEqual([
      'BREW_EMAIL_DEFAULT_MAX_AGE_SECONDS',
      'BrewEmail',
    ])
  })
})
