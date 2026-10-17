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
    'sends %s to %s with the verify link, and answers 200 {}',
    async (action, key) => {
      const fires = captureFires()

      const response = await hook({ appName: 'Acme' })(
        await signedRequest({ user: USER, email_data: emailData(action) })
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
          },
          idempotencyKey: expectedIdempotencyKey(
            key,
            'jane@example.com',
            action,
            `pkce_hash_${action}`
          ),
        },
      ])
    }
  )

  it("adds the code as `otp` to link emails with verification: 'code'", async () => {
    const fires = captureFires()

    await hook({ verification: 'code' })(
      await signedRequest({ user: USER, email_data: emailData('magiclink') })
    )

    expect(fires[0]?.payload).toMatchObject({
      confirmationUrl: verifyUrl('pkce_hash_magiclink', 'magiclink'),
      otp: '123456',
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
    {
      name: 'a link email with no token hash',
      user: USER,
      data: emailData('magiclink', { token_hash: '' }),
      expected: (id: string) => [
        expectedIdempotencyKey(
          'auth.magic-link',
          'jane@example.com',
          'magiclink',
          `123456:${id}`
        ),
      ],
    },
    {
      name: 'a link email with no site_url',
      user: USER,
      data: emailData('recovery', { site_url: '' }),
      expected: (id: string) => [
        expectedIdempotencyKey(
          'auth.password-reset',
          'jane@example.com',
          'recovery',
          `123456:${id}`
        ),
      ],
    },
    {
      name: 'an email change with no token hash',
      user: { ...USER, new_email: 'jane@new.example.com' },
      data: emailData('email_change', { token_hash: '' }),
      expected: (id: string) => [
        expectedIdempotencyKey(
          'auth.email-change',
          'jane@new.example.com',
          'email_change',
          `123456:${id}`
        ),
      ],
    },
    {
      name: 'a secure email change whose new address has no token hash',
      user: { ...USER, new_email: 'jane@new.example.com' },
      data: emailData('email_change', {
        token: '111111',
        token_hash: '',
        token_new: '222222',
        token_hash_new: 'hash_for_current',
      }),
      expected: (id: string) => [
        expectedIdempotencyKey(
          'auth.email-change',
          'jane@example.com',
          'email_change',
          'hash_for_current'
        ),
        expectedIdempotencyKey(
          'auth.email-change',
          'jane@new.example.com',
          'email_change',
          `222222:${id}`
        ),
      ],
    },
  ])(
    'keys the code sent in place of a link by the code and the webhook-id: $name',
    async ({ user, data, expected }) => {
      const fires = captureFires()
      const body = { user, email_data: data }

      await hook()(await signedRequest(body, { id: 'msg_a' }))
      await hook()(await signedRequest(body, { id: 'msg_b' }))

      // Two requests that drew the same code each send: a fresh request is
      // never replayed as the earlier one.
      expect(new Set(fires.map((fire) => fire.idempotencyKey))).toEqual(
        new Set([...expected('msg_a'), ...expected('msg_b')])
      )
    }
  )

  it.each([
    ['email', 'auth.otp'],
    ['reauthentication', 'auth.reauthentication'],
  ])('sends the %s code to %s as `otp`', async (action, key) => {
    const fires = captureFires()

    await hook()(
      await signedRequest(
        { user: USER, email_data: emailData(action, { token_hash: '' }) },
        { id: 'msg_code' }
      )
    )

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
          '123456:msg_code'
        ),
      },
    ])
  })

  it('secure email change: two sends, current address with token_hash_new, new address with token_hash', async () => {
    const fires = captureFires()

    const response = await hook({ verification: 'code' })(
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

  it('answers 401 { error } for a bad signature, and sends nothing', async () => {
    const fires = captureFires()
    const onError = vi.fn()

    const response = await hook({ onError })(
      await signedRequest(
        { user: USER, email_data: emailData('signup') },
        { secret: 'v1,whsec_c29tZW9uZS1lbHNlcy1zZWNyZXQ=' }
      )
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: {
        http_code: 401,
        message: 'No webhook signature matches the secret.',
      },
    })
    expect(fires).toEqual([])
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('answers 400 for an action it does not know and 405 for anything but POST', async () => {
    const unknown = await hook()(
      await signedRequest({
        user: USER,
        email_data: emailData('carrier_pigeon'),
      })
    )
    const get = await hook()(new Request('https://fn.example.com/send-email'))

    expect(unknown.status).toBe(400)
    await expect(unknown.json()).resolves.toEqual({
      error: {
        http_code: 400,
        message: 'Unsupported email_action_type: carrier_pigeon.',
      },
    })
    expect(get.status).toBe(405)
  })

  it('answers 500 { error } when Brew refuses, so Supabase reports the send as failed', async () => {
    captureFires(() => apiError(422, 'NO_PUBLISHED_AUTOMATION'))

    const response = await hook()(
      await signedRequest({ user: USER, email_data: emailData('recovery') })
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: {
        http_code: 500,
        message:
          'Brew could not send the email: NO_PUBLISHED_AUTOMATION from the test server.',
      },
    })
  })

  it('still answers its error response when onError throws', async () => {
    captureFires(() => apiError(422, 'NO_PUBLISHED_AUTOMATION'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const reporterFailure = new Error('reporter down')

    const response = await hook({
      onError: () => {
        throw reporterFailure
      },
    })(await signedRequest({ user: USER, email_data: emailData('recovery') }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: {
        http_code: 500,
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
