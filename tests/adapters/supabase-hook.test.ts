import { createHmac } from 'node:crypto'

import { HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import {
  createSupabaseSendEmailHook,
  type CreateSupabaseSendEmailHookOptions,
  defaultSupabaseConfirmationUrl,
  signStandardWebhook,
  type SupabaseSendEmailHookPayload,
} from '../../src/adapters/supabase'

import {
  apiError,
  captureFires,
  expectedIdempotencyKey,
  testClient,
} from './helpers'

const SECRET = 'v1,whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw'

/**
 * What a send's idempotency key hashes, computed independently of the SDK:
 * an HMAC of the verified body under the hook secret. Supabase signs each
 * retry with a new `webhook-id` but the same body.
 */
function callId(body: unknown, secret = SECRET): string {
  return createHmac(
    'sha256',
    Buffer.from(secret.replace(/^v1,whsec_/, ''), 'base64')
  )
    .update(`brew.send-email-hook.v1\n${JSON.stringify(body)}`)
    .digest('hex')
}
const SITE_URL = 'https://abcd.supabase.co'
const REDIRECT_TO = 'https://app.example.com/welcome?from=email'

const USER = {
  id: 'usr_1',
  email: 'jane@example.com',
  user_metadata: { full_name: 'Jane Doe' },
}

function emailData(
  action: string,
  extra: Partial<SupabaseSendEmailHookPayload['email_data']> = {}
): SupabaseSendEmailHookPayload['email_data'] {
  return {
    token: '123456',
    token_hash: `pkce_hash_${action}`,
    redirect_to: REDIRECT_TO,
    email_action_type: action,
    site_url: SITE_URL,
    token_new: '',
    token_hash_new: '',
    ...extra,
  }
}

async function signedRequest(
  body: unknown,
  { secret = SECRET, id = 'msg_1' }: { secret?: string; id?: string } = {}
): Promise<Request> {
  const payload = JSON.stringify(body)
  const timestamp = Math.floor(Date.now() / 1000)
  return new Request('https://fn.example.com/send-email', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'webhook-id': id,
      'webhook-timestamp': String(timestamp),
      'webhook-signature': await signStandardWebhook({
        id,
        timestamp,
        payload,
        secret,
      }),
    },
    body: payload,
  })
}

function hook(options: Partial<CreateSupabaseSendEmailHookOptions> = {}) {
  return createSupabaseSendEmailHook({
    client: testClient(),
    secret: SECRET,
    onError: () => undefined,
    ...options,
  })
}

function verifyUrl(tokenHash: string, type: string) {
  const query = new URLSearchParams({
    token: tokenHash,
    type,
    redirect_to: REDIRECT_TO,
  })
  return `${SITE_URL}/auth/v1/verify?${query.toString()}`
}

describe('defaultSupabaseConfirmationUrl', () => {
  it("builds Supabase's verify link from the API URL, with or without /auth/v1", () => {
    const input = {
      tokenHash: 'abc',
      type: 'signup',
      redirectTo: REDIRECT_TO,
    }

    expect(
      defaultSupabaseConfirmationUrl({ siteUrl: SITE_URL, ...input })
    ).toBe(verifyUrl('abc', 'signup'))
    expect(
      defaultSupabaseConfirmationUrl({
        siteUrl: `${SITE_URL}/auth/v1/`,
        ...input,
      })
    ).toBe(verifyUrl('abc', 'signup'))
  })
})

describe('createSupabaseSendEmailHook', () => {
  it.each([
    ['signup', 'auth.verify-email'],
    ['recovery', 'auth.password-reset'],
    ['magiclink', 'auth.magic-link'],
    ['invite', 'auth.invite'],
  ])(
    'sends %s to %s with the verify link and the code, and answers 200 {}',
    async (action, key) => {
      const fires = captureFires()
      const body = { user: USER, email_data: emailData(action) }

      const response = await hook({ appName: 'Acme' })(
        await signedRequest(body)
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({})
      expect(fires).toEqual([
        {
          key,
          payload: {
            email: 'jane@example.com',
            appName: 'Acme',
            userName: 'Jane Doe',
            confirmationUrl: verifyUrl(`pkce_hash_${action}`, action),
            otp: '123456',
          },
          idempotencyKey: expectedIdempotencyKey(
            key,
            'jane@example.com',
            action,
            callId(body)
          ),
        },
      ])
    }
  )

  it('sends a link email without `otp` when Supabase sent no code', async () => {
    const fires = captureFires()

    await hook()(
      await signedRequest({
        user: USER,
        email_data: emailData('magiclink', { token: '' }),
      })
    )

    expect(fires[0]?.payload).toEqual({
      email: 'jane@example.com',
      userName: 'Jane Doe',
      confirmationUrl: verifyUrl('pkce_hash_magiclink', 'magiclink'),
    })
  })

  it('sends the code when there is no token hash to build a link from', async () => {
    const fires = captureFires()

    await hook()(
      await signedRequest({
        user: USER,
        email_data: emailData('signup', { token_hash: '' }),
      })
    )

    expect(fires[0]?.payload).toEqual({
      email: 'jane@example.com',
      userName: 'Jane Doe',
      otp: '123456',
    })
  })

  it.each([
    { name: 'a link email', user: USER, data: emailData('magiclink') },
    {
      name: 'a code sent in place of a link',
      user: USER,
      data: emailData('recovery', { site_url: '' }),
    },
    {
      name: 'a sign-in code',
      user: USER,
      data: emailData('email', { token_hash: '' }),
    },
    {
      name: 'a secure email change (two sends)',
      user: { ...USER, new_email: 'jane@new.example.com' },
      data: emailData('email_change', {
        token: '111111',
        token_hash: 'hash_for_new',
        token_new: '222222',
        token_hash_new: 'hash_for_current',
      }),
    },
    {
      name: 'a security notice',
      user: USER,
      data: emailData('password_changed_notification', {
        token: '',
        token_hash: '',
      }),
    },
  ])(
    "keys $name by the verified body: Supabase's retries replay, a new call sends",
    async ({ user, data }) => {
      const fires = captureFires()
      const body = { user, email_data: data }
      // The next call for the same user and action: Supabase's body
      // changes (here the user's updated_at), even for a notice or a code
      // that repeats.
      const next = {
        user: { ...user, updated_at: '2026-10-21T00:00:01Z' },
        email_data: data,
      }

      // Supabase signs every retry of one call with a new webhook-id.
      await hook()(await signedRequest(body, { id: 'msg_a' }))
      await hook()(await signedRequest(body, { id: 'msg_b' }))
      await hook()(await signedRequest(next, { id: 'msg_c' }))

      const keysOf = (from: number, to: number) =>
        fires.slice(from, to).map((fire) => fire.idempotencyKey)
      const perCall = fires.length / 3
      const recipients = fires
        .slice(0, perCall)
        .map((fire) => String(fire.payload['email']))
      expect(keysOf(0, perCall).sort()).toEqual(
        recipients
          .map((email) =>
            expectedIdempotencyKey(
              fires[0]?.key ?? '',
              email,
              data.email_action_type,
              callId(body)
            )
          )
          .sort()
      )
      expect(keysOf(perCall, 2 * perCall)).toEqual(keysOf(0, perCall))
      expect(new Set(keysOf(0, 3 * perCall)).size).toBe(2 * perCall)
    }
  )

  it.each([
    ['email', 'auth.otp'],
    ['reauthentication', 'auth.reauthentication'],
  ])('sends the %s code to %s as `otp`', async (action, key) => {
    const fires = captureFires()
    const body = {
      user: USER,
      email_data: emailData(action, { token_hash: '' }),
    }

    await hook()(await signedRequest(body, { id: 'msg_code' }))

    expect(fires).toEqual([
      {
        key,
        payload: {
          email: 'jane@example.com',
          userName: 'Jane Doe',
          otp: '123456',
        },
        idempotencyKey: expectedIdempotencyKey(
          key,
          'jane@example.com',
          action,
          callId(body)
        ),
      },
    ])
  })

  it('secure email change: two sends, current address with token_hash_new, new address with token_hash', async () => {
    const fires = captureFires()

    const response = await hook()(
      await signedRequest({
        user: { ...USER, new_email: 'jane@new.example.com' },
        email_data: emailData('email_change', {
          token: '111111',
          token_hash: 'hash_for_new',
          token_new: '222222',
          token_hash_new: 'hash_for_current',
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(
      [...fires]
        .sort((left, right) =>
          String(left.payload['email']).localeCompare(
            String(right.payload['email'])
          )
        )
        .map(({ key, payload }) => ({ key, payload }))
    ).toEqual([
      {
        key: 'auth.email-change',
        payload: {
          email: 'jane@example.com',
          userName: 'Jane Doe',
          newEmail: 'jane@new.example.com',
          confirmationUrl: verifyUrl('hash_for_current', 'email_change'),
          otp: '111111',
        },
      },
      {
        key: 'auth.email-change',
        payload: {
          email: 'jane@new.example.com',
          userName: 'Jane Doe',
          newEmail: 'jane@new.example.com',
          confirmationUrl: verifyUrl('hash_for_new', 'email_change'),
          otp: '222222',
        },
      },
    ])
    expect(new Set(fires.map((fire) => fire.idempotencyKey)).size).toBe(2)
  })

  it('email change without secure change: one send, to the new address', async () => {
    const fires = captureFires()

    await hook()(
      await signedRequest({
        user: { ...USER, new_email: 'jane@new.example.com' },
        email_data: emailData('email_change', { token_hash: 'hash_for_new' }),
      })
    )

    expect(fires.map(({ key, payload }) => ({ key, payload }))).toEqual([
      {
        key: 'auth.email-change',
        payload: {
          email: 'jane@new.example.com',
          userName: 'Jane Doe',
          newEmail: 'jane@new.example.com',
          confirmationUrl: verifyUrl('hash_for_new', 'email_change'),
          otp: '123456',
        },
      },
    ])
  })

  it.each([
    'password_changed',
    'phone_changed',
    'identity_linked',
    'identity_unlinked',
    'mfa_factor_enrolled',
    'mfa_factor_unenrolled',
    'passkey_added',
  ])(
    'sends %s_notification to auth.security-notice with its noticeType',
    async (noticeType) => {
      const fires = captureFires()

      await hook()(
        await signedRequest({
          user: USER,
          email_data: emailData(`${noticeType}_notification`, {
            token: '',
            token_hash: '',
          }),
        })
      )

      expect(fires.map(({ key, payload }) => ({ key, payload }))).toEqual([
        {
          key: 'auth.security-notice',
          payload: {
            email: 'jane@example.com',
            userName: 'Jane Doe',
            noticeType,
          },
        },
      ])
    }
  )

  it('sends the email-changed notice to the address the account left', async () => {
    const fires = captureFires()

    await hook()(
      await signedRequest({
        user: { ...USER, email: 'jane@new.example.com' },
        email_data: emailData('email_changed_notification', {
          token: '',
          token_hash: '',
          old_email: 'jane@example.com',
        }),
      })
    )

    expect(fires[0]?.payload).toEqual({
      email: 'jane@example.com',
      userName: 'Jane Doe',
      newEmail: 'jane@new.example.com',
      noticeType: 'email_changed',
    })
  })

  it('uses your keys and your confirmation link builder', async () => {
    const fires = captureFires()

    await hook({
      keys: { verifyEmail: 'acme.confirm' },
      confirmationUrl: ({ tokenHash, type }) =>
        `https://app.example.com/auth/confirm?token_hash=${tokenHash}&type=${type}`,
    })(await signedRequest({ user: USER, email_data: emailData('signup') }))

    expect(fires[0]).toMatchObject({
      key: 'acme.confirm',
      payload: {
        confirmationUrl:
          'https://app.example.com/auth/confirm?token_hash=pkce_hash_signup&type=signup',
      },
    })
  })

  // Supabase Auth reads a hook's body only on a 200 (supabase/auth
  // internal/hooks/hookshttp.go): any other status becomes a generic 500
  // and the message is lost. Only 429/503 with Retry-After is retried.
  it('answers 200 { error: 401 } for a bad signature, and sends nothing', async () => {
    const fires = captureFires()
    const onError = vi.fn()

    const response = await hook({ onError })(
      await signedRequest(
        { user: USER, email_data: emailData('signup') },
        { secret: 'v1,whsec_c29tZW9uZS1lbHNlcy1zZWNyZXQ=' }
      )
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      error: {
        http_code: 401,
        message: 'No webhook signature matches the secret.',
      },
    })
    expect(fires).toEqual([])
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('answers 200 { error: 500 } for a hook secret that is not v1,whsec_…', async () => {
    const response = await hook({ secret: 'v1,whsec_' })(
      await signedRequest({ user: USER, email_data: emailData('signup') })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      error: { http_code: 500 },
    })
  })

  it('answers 200 { error: 400 } for an action it does not know, and 405 for anything but POST', async () => {
    const unknown = await hook()(
      await signedRequest({
        user: USER,
        email_data: emailData('carrier_pigeon'),
      })
    )
    const get = await hook()(new Request('https://fn.example.com/send-email'))

    expect(unknown.status).toBe(200)
    await expect(unknown.json()).resolves.toEqual({
      error: {
        http_code: 400,
        message: 'Unsupported email_action_type: carrier_pigeon.',
      },
    })
    // Not a hook call: Supabase only ever POSTs.
    expect(get.status).toBe(405)
  })

  it.each([
    [422, 'NO_PUBLISHED_AUTOMATION', 422],
    [404, 'TRIGGER_KEY_NOT_FOUND', 404],
    [429, 'SANDBOX_DAILY_LIMIT', 429],
    // Supabase retries at once, with no wait: a rate limit would refuse
    // every attempt, so it fails the auth request with its message instead.
    [429, 'RATE_LIMITED', 429],
    // A key Brew does not accept is this server's setup, not the user's.
    [401, 'INVALID_API_KEY', 500],
    [403, 'INSUFFICIENT_PERMISSIONS', 500],
  ])(
    'answers 200 { error } when Brew refuses (%i %s → http_code %i), so the auth request fails with the message',
    async (status, code, httpCode) => {
      captureFires(() => apiError(status, code))

      const response = await hook()(
        await signedRequest({ user: USER, email_data: emailData('recovery') })
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        error: {
          http_code: httpCode,
          message: `Brew could not send the email: ${code} from the test server.`,
        },
      })
    }
  )

  it.each([
    ['a 503', () => apiError(503, 'SERVICE_UNAVAILABLE', 'api_error')],
    ['a 500', () => apiError(500, 'INTERNAL_ERROR', 'api_error')],
    ['a dropped connection', () => HttpResponse.error()],
  ])(
    'answers 503 with Retry-After for %s, so Supabase retries at once',
    async (_name, respond) => {
      captureFires(respond)

      const response = await hook()(
        await signedRequest({ user: USER, email_data: emailData('recovery') })
      )

      expect(response.status).toBe(503)
      expect(response.headers.get('retry-after')).toBe('1')
      await expect(response.json()).resolves.toMatchObject({
        error: { http_code: 503 },
      })
    }
  )

  it('still answers its error response when onError throws', async () => {
    captureFires(() => apiError(422, 'NO_PUBLISHED_AUTOMATION'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const reporterFailure = new Error('reporter down')

    const response = await hook({
      onError: () => {
        throw reporterFailure
      },
    })(await signedRequest({ user: USER, email_data: emailData('recovery') }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      error: {
        http_code: 422,
        message:
          'Brew could not send the email: NO_PUBLISHED_AUTOMATION from the test server.',
      },
    })
    expect(consoleError).toHaveBeenCalledWith(
      '[@brew.new/sdk/supabase] onError threw',
      reporterFailure
    )
  })
})
