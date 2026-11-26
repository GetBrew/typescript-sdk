import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import {
  BrewApiError,
  createBrewClient,
  type BrewErrorEnvelope,
  type EmailMigration,
  type StartEmailMigrationInput,
} from '../../../src/index'
import { server } from '../../msw/server'

const migration: EmailMigration = {
  migrationId: 'mig_fixture',
  capabilityGrantId: 'grant_marketing_emails',
  dryRun: true,
  status: 'completed',
  nextIndex: 1,
  total: 1,
  outcomes: [
    { sourceId: '123', revision: 'revision_1', status: 'ready-to-import' },
  ],
  limitations: ['hosted-copy-may-differ', 'delivery-records-not-included'],
  nextAction: 'review',
}

const brew = () =>
  createBrewClient({
    apiKey: 'brew_test_fixture',
    brandId: 'brand_selected',
    baseUrl: 'https://brew.new/api',
    maxRetries: 0,
  })

describe('emailMigrations lifecycle', () => {
  it('starts an inventory without replacing the server dry-run default and exposes raw acceptance', async () => {
    let body: unknown
    let captured: Request | undefined
    server.use(
      http.post(
        'https://brew.new/api/v1/email-migrations',
        async ({ request }) => {
          captured = request.clone()
          body = await request.json()
          return HttpResponse.json(migration, {
            status: 202,
            headers: { 'x-request-id': 'req_inventory' },
          })
        }
      )
    )
    const input: StartEmailMigrationInput = {
      items: [{ sourceId: '123' }],
    }
    const response = await brew().emailMigrations.start(input, {
      raw: true,
      idempotencyKey: 'inventory_1',
    })
    expect(body).toEqual(input)
    expect(body).not.toHaveProperty('dryRun')
    expect(body).not.toHaveProperty('capabilityGrantId')
    expect(captured?.headers.get('x-brand-id')).toBe('brand_selected')
    expect(captured?.headers.get('idempotency-key')).toBe('inventory_1')
    expect(response.status).toBe(202)
    expect(response.requestId).toBe('req_inventory')
    expect(response.data).toEqual(migration)
    expectTypeOf(response.data).toEqualTypeOf<EmailMigration>()
  })

  it('forwards explicit import approval, exact source revisions, and destination group', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/email-migrations',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({
            ...migration,
            dryRun: false,
            status: 'running',
            nextAction: 'wait',
            leaseExpiresAt: 1_800_000_000_000,
          })
        }
      )
    )
    const input: StartEmailMigrationInput = {
      capabilityGrantId: 'grant_marketing_emails',
      items: [{ sourceId: '123', expectedRevision: 'revision_1' }],
      dryRun: false,
      targetGroupId: 'grp_archive',
    }
    const response = await brew().emailMigrations.start(input)
    expect(body).toEqual(input)
    expect(response).toMatchObject({
      dryRun: false,
      status: 'running',
      nextAction: 'wait',
      leaseExpiresAt: 1_800_000_000_000,
    })
    const leaseExpiresAt: number | undefined = response.leaseExpiresAt
    expect(leaseExpiresAt).toBe(1_800_000_000_000)
  })

  it('reads an encoded identity without a body and retains held outcomes and retry timing', async () => {
    let captured: Request | undefined
    const held: EmailMigration = {
      ...migration,
      status: 'held',
      nextIndex: 0,
      outcomes: [],
      hold: {
        sourceId: '123',
        reason: 'rate-limited',
        retryAt: 1_800_000_000_000,
      },
      nextAction: 'resume',
    }
    server.use(
      http.get(
        'https://brew.new/api/v1/email-migrations/mig%2Fshared',
        ({ request }) => {
          captured = request.clone()
          return HttpResponse.json(held)
        }
      )
    )
    await expect(brew().emailMigrations.get('mig/shared')).resolves.toEqual(
      held
    )
    expect(captured?.method).toBe('GET')
    expect(captured?.headers.get('x-brand-id')).toBe('brand_selected')
    expect(await captured?.text()).toBe('')
  })

  it.each([
    ['resume', 'running', 'wait', 202],
    ['cancel', 'canceled', 'none', 200],
  ] as const)(
    'uses the bodyless %s action route and keeps caller request options',
    async (action, status, nextAction, code) => {
      let captured: Request | undefined
      const result = { ...migration, status, nextAction }
      server.use(
        http.post(
          `https://brew.new/api/v1/email-migrations/mig%2Fshared/${action}`,
          ({ request }) => {
            captured = request.clone()
            return HttpResponse.json(result, {
              status: code,
              headers: { 'x-request-id': `req_${action}` },
            })
          }
        )
      )
      const response = await brew().emailMigrations[action]('mig/shared', {
        raw: true,
        idempotencyKey: `${action}_1`,
      })
      expect(captured?.method).toBe('POST')
      expect(captured?.headers.get('idempotency-key')).toBe(`${action}_1`)
      expect(await captured?.text()).toBe('')
      expect(response.status).toBe(code)
      expect(response.requestId).toBe(`req_${action}`)
      expect(response.data).toEqual(result)
    }
  )

  it('keeps explicit imported versions, warnings, unsupported sources, and fidelity limitations', async () => {
    const result: EmailMigration = {
      ...migration,
      dryRun: false,
      status: 'partial',
      total: 2,
      nextIndex: 2,
      outcomes: [
        {
          sourceId: '123',
          revision: 'revision_1',
          status: 'imported',
          emailId: 'eml_imported',
          emailVersionId: 'emv_exact',
          warningCodes: ['fetch_failed_retained'],
        },
        {
          sourceId: '456',
          status: 'unsupported',
          reason: 'source-html-unavailable',
        },
      ],
    }
    server.use(
      http.get('https://brew.new/api/v1/email-migrations/mig_fixture', () =>
        HttpResponse.json(result)
      )
    )
    await expect(brew().emailMigrations.get('mig_fixture')).resolves.toEqual(
      result
    )
  })

  it('surfaces an active-worker migration conflict through the shared typed error transport', async () => {
    const error: BrewErrorEnvelope = {
      code: 'EMAIL_MIGRATION_CONFLICT',
      type: 'conflict',
      message: 'The migration already has an active worker.',
      suggestion: 'Read the migration status before retrying.',
      docs: 'https://docs.brew.new/api-reference/api/errors',
    }
    const handler = vi.fn(() =>
      HttpResponse.json(
        { error },
        { status: 409, headers: { 'x-request-id': 'req_conflict' } }
      )
    )
    server.use(
      http.post(
        'https://brew.new/api/v1/email-migrations/mig_fixture/resume',
        handler
      )
    )
    const request = brew().emailMigrations.resume('mig_fixture')
    await expect(request).rejects.toBeInstanceOf(BrewApiError)
    await expect(request).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_MIGRATION_CONFLICT',
      type: 'conflict',
      message: 'The migration already has an active worker.',
      requestId: 'req_conflict',
    })
    expect(handler).toHaveBeenCalledOnce()
  })

  it('preserves an explicit caller abort and performs no request', async () => {
    const controller = new AbortController()
    const reason = new Error('Caller canceled the inventory')
    controller.abort(reason)
    const handler = vi.fn(() => HttpResponse.json(migration))
    server.use(http.post('https://brew.new/api/v1/email-migrations', handler))
    const client = brew()
    await expect(
      client.emailMigrations.start(
        {
          capabilityGrantId: 'grant_marketing_emails',
          items: [{ sourceId: '123' }],
        },
        { signal: controller.signal }
      )
    ).rejects.toBe(reason)
    expect(handler).not.toHaveBeenCalled()
  })

  it('exposes strict generated request types and path-identity signatures', () => {
    const client = brew()
    const callerTenantOverride = () =>
      client.emailMigrations.start({
        items: [{ sourceId: '123' }],
        // @ts-expect-error -- tenant authority comes from the configured client, not a body field.
        orgId: 'org_untrusted',
      })
    const missingSources = () =>
      client.emailMigrations.start(
        // @ts-expect-error -- an explicit source inventory is required.
        { capabilityGrantId: 'grant_marketing_emails' }
      )
    const wrongRevision = () =>
      client.emailMigrations.start({
        capabilityGrantId: 'grant_marketing_emails',
        items: [
          // @ts-expect-error -- revisions are opaque strings, not timestamps.
          { sourceId: '123', expectedRevision: 123 },
        ],
      })
    const noModeChangeOnResume = () =>
      client.emailMigrations.resume('mig_fixture', {
        // @ts-expect-error -- resume retains the job mode; it accepts request options only.
        dryRun: false,
      })
    const positionalGet = () =>
      client.emailMigrations.get(
        // @ts-expect-error -- one-resource reads take the URL identity positionally.
        { migrationId: 'mig_fixture' }
      )
    expect([
      callerTenantOverride,
      missingSources,
      wrongRevision,
      noModeChangeOnResume,
      positionalGet,
    ]).toHaveLength(5)
  })
})
