import { createHash } from 'node:crypto'

import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  RESEND_MIGRATION_COMMAND,
  RESEND_MIGRATION_DOCS_URL,
  Resend,
} from '../../src/adapters/resend'
import type { BrewClient } from '../../src/index'
import { server } from '../msw/server'

import { apiError, baseUrl, captureFires, testClient } from './helpers'

function resend(options: ConstructorParameters<typeof Resend>[1] = {}) {
  return new Resend(undefined, {
    client: testClient(),
    onWarning: () => undefined,
    ...options,
  })
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('@brew.new/sdk/resend emails.send', () => {
  it('sends the mapped template by key with the variables and the recipient', async () => {
    const fires = captureFires()

    const result = await resend({
      templates: { tmpl_reset: 'auth.password-reset' },
    }).emails.send(
      {
        to: 'Jane Doe <jane@example.com>',
        template: {
          id: 'tmpl_reset',
          variables: {
            confirmationUrl: 'https://app.example.com/reset?t=1',
            email: 'not-the-recipient@example.com',
            expiresInMinutes: 60,
          },
        },
      },
      { idempotencyKey: 'reset:user_1' }
    )

    expect(result).toEqual({
      data: { id: 'tin_0' },
      error: null,
      headers: null,
    })
    expect(fires).toEqual([
      {
        key: 'auth.password-reset',
        // The recipient wins over `variables.email`.
        payload: {
          confirmationUrl: 'https://app.example.com/reset?t=1',
          email: 'jane@example.com',
          expiresInMinutes: 60,
        },
        idempotencyKey: 'reset:user_1',
      },
    ])
  })

  it('takes an unmapped template id as the trigger key, and a one-element `to` list', async () => {
    const fires = captureFires()

    const result = await resend().emails.send({
      to: ['jane@example.com'],
      template: { id: 'order.paid', variables: { total: 42 } },
    })

    expect(result.error).toBeNull()
    expect(fires[0]).toMatchObject({
      key: 'order.paid',
      payload: { email: 'jane@example.com', total: 42 },
    })
  })

  it.each(['constructor', 'toString', '__proto__'])(
    'reads only your own `templates` entries: an unmapped `%s` is its own trigger key',
    async (id) => {
      const fires = captureFires()

      const result = await resend({
        templates: { tmpl_reset: 'auth.password-reset' },
      }).emails.send({ to: 'jane@example.com', template: { id } })

      expect(result.error).toBeNull()
      expect(fires.map((fire) => fire.key)).toEqual([id])
    }
  )

  it('ignores `from` and `subject` with one warning, however many sends carry them', async () => {
    captureFires()
    const onWarning = vi.fn()
    const client = resend({ onWarning })
    const email = {
      from: 'Acme <hi@acme.dev>',
      subject: 'Reset your password',
      to: 'jane@example.com',
      template: { id: 'auth.password-reset' },
    }

    await client.emails.send(email)
    await client.emails.send(email)

    expect(onWarning).toHaveBeenCalledTimes(1)
    expect(onWarning.mock.calls[0]?.[0]).toMatch(/`from`, `subject` ignored/)
  })

  it('exports the migrate command it points at', () => {
    expect(RESEND_MIGRATION_COMMAND).toBe('npx @brew.new/cli migrate resend')
  })

  it('refuses html, react and text without a template: brew_template_required', async () => {
    const fires = captureFires()
    const client = resend()

    const results = await Promise.all([
      client.emails.send({ to: 'jane@example.com', html: '<p>Hi</p>' }),
      client.emails.send({ to: 'jane@example.com', text: 'Hi' }),
      client.emails.send({ to: 'jane@example.com', react: { type: 'div' } }),
    ])

    for (const result of results) {
      expect(result.data).toBeNull()
      expect(result.error).toMatchObject({
        name: 'brew_template_required',
        statusCode: 422,
      })
      expect(result.error?.message).toContain(
        'Brew sends app email from templates. Import this design into Brew and send it by key'
      )
      expect(result.error?.message).toContain(RESEND_MIGRATION_COMMAND)
      expect(result.error?.message).toContain(RESEND_MIGRATION_DOCS_URL)
      // The unscoped `brew.new` npm name is not ours to point at.
      expect(result.error?.message).not.toMatch(/npx brew\.new|brew\.new init/)
    }
    expect(fires).toEqual([])
  })

  it.each([
    ['cc', { cc: 'boss@example.com' }],
    ['bcc', { bcc: ['audit@example.com'] }],
    ['attachments', { attachments: [{ filename: 'a.pdf' }] }],
    ['headers', { headers: { 'X-Entity-Ref-ID': '1' } }],
    ['scheduledAt', { scheduledAt: 'in 1 hour' }],
  ])('refuses `%s`: brew_unsupported_field', async (field, extra) => {
    const fires = captureFires()

    const result = await resend().emails.send({
      to: 'jane@example.com',
      template: { id: 'auth.password-reset' },
      ...extra,
    })

    expect(result.data).toBeNull()
    expect(result.error?.name).toBe('brew_unsupported_field')
    expect(result.error?.message).toContain(`\`${field}\``)
    expect(fires).toEqual([])
  })

  it('refuses several `to` recipients and points at batch.send', async () => {
    const result = await resend().emails.send({
      to: ['jane@example.com', 'joe@example.com'],
      template: { id: 'auth.password-reset' },
    })

    expect(result.error?.name).toBe('brew_unsupported_field')
    expect(result.error?.message).toContain('batch.send')
  })

  it('answers validation_error without a recipient or a template id', async () => {
    const client = resend()

    const [noRecipient, noTemplateId] = await Promise.all([
      client.emails.send({ to: '', template: { id: 'auth.password-reset' } }),
      client.emails.send({ to: 'jane@example.com', template: { id: ' ' } }),
    ])

    expect(noRecipient.error?.name).toBe('validation_error')
    expect(noTemplateId.error?.name).toBe('validation_error')
  })

  it('reads the API key from BREW_API_KEY by default', async () => {
    vi.stubEnv('BREW_API_KEY', 'brew_from_env')
    let authorization: string | null = null
    server.use(
      http.post(
        `${baseUrl}/v1/automations/triggers/by-key/:key/fire`,
        ({ request }) => {
          authorization = request.headers.get('authorization')
          return HttpResponse.json(
            {
              triggerInstanceId: 'tin_env',
              triggerEventId: 'tri_env',
              triggerKey: 'auth.password-reset',
              status: 'triggered',
              automationRunIds: [],
              publishedAutomations: [],
              counts: { automations: 1, skipped: 0 },
              warnings: [],
              receivedAt: '2026-10-13T08:00:00.000Z',
            },
            { status: 202 }
          )
        }
      )
    )

    const result = await new Resend(undefined, { baseUrl }).emails.send({
      to: 'jane@example.com',
      template: { id: 'auth.password-reset' },
    })

    expect(result.data).toEqual({ id: 'tin_env' })
    expect(authorization).toBe('Bearer brew_from_env')
  })

  it('answers missing_api_key, without throwing, when there is no key', async () => {
    vi.stubEnv('BREW_API_KEY', '')

    const result = await new Resend().emails.send({
      to: 'jane@example.com',
      template: { id: 'auth.password-reset' },
    })

    expect(result).toEqual({
      data: null,
      error: expect.objectContaining({
        name: 'missing_api_key',
        statusCode: 401,
      }) as unknown,
      headers: null,
    })
  })
})

describe('@brew.new/sdk/resend error mapping', () => {
  it.each([
    [400, 'INVALID_PAYLOAD', 'validation_error'],
    [401, 'INVALID_API_KEY', 'invalid_api_key'],
    [401, 'AUTHENTICATION_REQUIRED', 'missing_api_key'],
    [403, 'INSUFFICIENT_PERMISSIONS', 'restricted_api_key'],
    [404, 'TRIGGER_KEY_NOT_FOUND', 'not_found'],
    [409, 'IDEMPOTENCY_CONFLICT', 'invalid_idempotent_request'],
    [409, 'IDEMPOTENCY_IN_PROGRESS', 'concurrent_idempotent_requests'],
    [402, 'SEND_QUOTA_EXCEEDED', 'monthly_quota_exceeded'],
    [422, 'NO_PUBLISHED_AUTOMATION', 'validation_error'],
    [422, 'DOMAIN_REQUIRED', 'validation_error'],
    [429, 'RATE_LIMITED', 'rate_limit_exceeded'],
    [429, 'SANDBOX_DAILY_LIMIT', 'daily_quota_exceeded'],
    [500, 'INTERNAL_ERROR', 'application_error'],
    [503, 'SERVICE_UNAVAILABLE', 'application_error'],
  ])('%i %s → %s', async (status, code, name) => {
    captureFires(() => apiError(status, code))

    const result = await resend().emails.send({
      to: 'jane@example.com',
      template: { id: 'auth.password-reset' },
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      name,
      message: `${code} from the test server.`,
      statusCode: status,
      brewCode: code,
      requestId: `req_${code.toLowerCase()}`,
    })
  })

  it('maps a dropped connection to application_error with statusCode null', async () => {
    captureFires(() => HttpResponse.error())

    const result = await resend().emails.send({
      to: 'jane@example.com',
      template: { id: 'auth.password-reset' },
    })

    expect(result.data).toBeNull()
    expect(result.error).toMatchObject({
      name: 'application_error',
      statusCode: null,
    })
  })

  it('never throws, even when the client throws a non-Error', async () => {
    const throwing: BrewClient = {
      ...testClient(),
      send: () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'boom'
      },
    }
    const client = new Resend(undefined, {
      client: throwing,
      onWarning: () => undefined,
    })

    await expect(
      client.emails.send({
        to: 'jane@example.com',
        template: { id: 'auth.password-reset' },
      })
    ).resolves.toEqual({
      data: null,
      error: { name: 'application_error', message: 'boom', statusCode: null },
      headers: null,
    })
    await expect(client.emails.send(null as never)).resolves.toMatchObject({
      error: { name: 'validation_error' },
    })
    await expect(client.batch.send('nope' as never)).resolves.toMatchObject({
      error: { name: 'validation_error' },
    })
  })
})

describe('@brew.new/sdk/resend batch.send', () => {
  it('sends one at a time, in order, with `${idempotencyKey}:${index}` per email', async () => {
    const fires = captureFires()

    const result = await resend().batch.send(
      [
        { to: 'a@example.com', template: { id: 'auth.magic-link' } },
        { to: 'b@example.com', template: { id: 'auth.magic-link' } },
        {
          to: 'c@example.com',
          template: { id: 'auth.otp', variables: { otp: '1' } },
        },
      ],
      { idempotencyKey: 'signin-batch' }
    )

    expect(result).toEqual({
      data: { data: [{ id: 'tin_0' }, { id: 'tin_1' }, { id: 'tin_2' }] },
      error: null,
      headers: null,
    })
    expect(
      fires.map((fire) => [fire.payload['email'], fire.idempotencyKey])
    ).toEqual([
      ['a@example.com', 'signin-batch:0'],
      ['b@example.com', 'signin-batch:1'],
      ['c@example.com', 'signin-batch:2'],
    ])
  })

  it('keeps every per-email key within the 100-character limit for a long idempotencyKey', async () => {
    const fires = captureFires()
    const emails = [
      { to: 'a@example.com', template: { id: 'auth.magic-link' } },
      { to: 'b@example.com', template: { id: 'auth.magic-link' } },
    ]
    // 100 characters: valid on its own, too long once `:${index}` is added.
    const longKey = `orders-2026-10-13:${'x'.repeat(82)}`
    // Shares the first 99 characters with `longKey`.
    const otherKey = `${longKey.slice(0, -1)}y`
    const digest = (key: string) =>
      createHash('sha256').update(key).digest('hex')

    const [first, retry] = [
      await resend().batch.send(emails, { idempotencyKey: longKey }),
      await resend().batch.send(emails, { idempotencyKey: longKey }),
    ]
    const other = await resend().batch.send(emails, {
      idempotencyKey: otherKey,
    })

    expect([first.error, retry.error, other.error]).toEqual([null, null, null])
    const keys = fires.map((fire) => fire.idempotencyKey ?? '')
    expect(keys.slice(0, 2)).toEqual([
      `${longKey.slice(0, 32)}:${digest(longKey)}:0`,
      `${longKey.slice(0, 32)}:${digest(longKey)}:1`,
    ])
    // A retry of the same batch replays: the same keys, in the same order.
    expect(keys.slice(2, 4)).toEqual(keys.slice(0, 2))
    // Another key that shares the prefix gets keys of its own.
    expect(keys.slice(4)).toEqual([
      `${otherKey.slice(0, 32)}:${digest(otherKey)}:0`,
      `${otherKey.slice(0, 32)}:${digest(otherKey)}:1`,
    ])
    for (const key of keys) {
      expect(key.length).toBeLessThanOrEqual(100)
    }
  })

  it('keeps `${idempotencyKey}:${index}` for a key of up to 97 characters, room for index 99', async () => {
    const fires = captureFires()
    const key = 'k'.repeat(97)

    await resend().batch.send(
      [{ to: 'a@example.com', template: { id: 'auth.magic-link' } }],
      { idempotencyKey: key }
    )

    expect(fires[0]?.idempotencyKey).toBe(`${key}:0`)
  })

  it('checks every email before sending any', async () => {
    const fires = captureFires()

    const result = await resend().batch.send([
      { to: 'a@example.com', template: { id: 'auth.magic-link' } },
      { to: 'b@example.com', html: '<p>Hi</p>' },
    ])

    expect(result.error?.name).toBe('brew_template_required')
    expect(result.error?.message).toMatch(/^emails\[1\]: .*Nothing was sent\.$/)
    expect(fires).toEqual([])
  })

  it('is not atomic: a failure stops the batch and says how far it got', async () => {
    const fires = captureFires((_fire, index) =>
      index === 1
        ? apiError(404, 'TRIGGER_KEY_NOT_FOUND', 'not_found')
        : undefined
    )

    const result = await resend().batch.send(
      [
        { to: 'a@example.com', template: { id: 'auth.magic-link' } },
        { to: 'b@example.com', template: { id: 'auth.unknown' } },
        { to: 'c@example.com', template: { id: 'auth.magic-link' } },
      ],
      { idempotencyKey: 'batch-1' }
    )

    expect(fires).toHaveLength(2)
    expect(result.data).toBeNull()
    expect(result.error).toMatchObject({ name: 'not_found', statusCode: 404 })
    expect(result.error?.message).toContain('emails[1]:')
    expect(result.error?.message).toContain('1 of 3 were sent')
    expect(result.error?.message).toContain('same idempotencyKey')
  })

  it('refuses an empty batch and one over 100 emails', async () => {
    const one = { to: 'a@example.com', template: { id: 'auth.magic-link' } }

    const [empty, tooMany] = await Promise.all([
      resend().batch.send([]),
      resend().batch.send(Array.from({ length: 101 }, () => one)),
    ])

    expect(empty.error?.name).toBe('validation_error')
    expect(tooMany.error?.name).toBe('validation_error')
    expect(tooMany.error?.message).toContain('at most 100')
  })
})
