import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { BrewApiError, createBrewClient, type BrewClient } from '../src/index'

import { server } from './msw/server'

/**
 * End-to-end tests that exercise the full SDK stack via `createBrewClient`.
 *
 * Every other test file in the repo targets a single layer (pure unit,
 * transport, or one resource method). This file proves that the layers
 * compose correctly: config resolution -> http client -> resource
 * factory -> user-facing method -> response unwrapping.
 *
 * The retry tuning override is the same fake-sleep trick the unit tests
 * use, so the entire flow runs instantly regardless of how many retries
 * the transport decides to attempt.
 */
function makeIntegrationClient(): BrewClient {
  return createBrewClient(
    {
      apiKey: 'brew_test_abc',
      baseUrl: 'https://brew.new/api',
      maxRetries: 2,
    },
    {
      retryBaseMs: 1,
      retryMaxMs: 1,
      random: () => 0,
      sleep: () => Promise.resolve(),
    }
  )
}

describe('createBrewClient — end-to-end', () => {
  it('exposes every resource method on the public client surface', () => {
    const brew = makeIntegrationClient()

    expect(typeof brew.audiences.list).toBe('function')
    // Reads are flat: `search` is the single contacts read (list/get-by-email folded in).
    expect(typeof brew.contacts.search).toBe('function')
    expect(typeof brew.contacts.searchAll).toBe('function')
    expect(typeof brew.contacts.count).toBe('function')
    expect(typeof brew.contacts.upsert).toBe('function')
    expect(typeof brew.contacts.upsertMany).toBe('function')
    expect(typeof brew.contacts.patch).toBe('function')
    expect(typeof brew.contacts.delete).toBe('function')
    expect(typeof brew.contacts.deleteMany).toBe('function')

    // One flat read per resource (`list` accepts an optional id + include).
    expect(typeof brew.domains.list).toBe('function')
    expect(typeof brew.audiences.list).toBe('function')
    expect(typeof brew.automations.list).toBe('function')
    expect(typeof brew.emails.list).toBe('function')
    expect(typeof brew.emails.generate).toBe('function')
    expect(typeof brew.emails.import).toBe('function')
    expect(typeof brew.fields.list).toBe('function')
    expect(typeof brew.fields.create).toBe('function')
    expect(typeof brew.fields.delete).toBe('function')
    // `POST /v1/sends` is the single polymorphic send (campaign | test).
    expect(typeof brew.emails.send).toBe('function')
    // `POST /v1/sends/{sendId}/cancel` — the send lifecycle action.
    expect(typeof brew.sends.cancel).toBe('function')
    expect(typeof brew.templates.list).toBe('function')
    // `GET /v1/usage` — plan, credit balance, email-send quota.
    expect(typeof brew.usage.get).toBe('function')

    // Nested surfaces: send reads + trigger CRUD/runs are flat reads.
    expect(typeof brew.analytics.sends.list).toBe('function')
    expect(typeof brew.automations.triggers.list).toBe('function')
    expect(typeof brew.automations.triggers.fire).toBe('function')
    expect(typeof brew.automations.runs.list).toBe('function')
    expect(typeof brew.analytics.triggerInstances.list).toBe('function')

    // Removed: no top-level me/integrations resources. The send action
    // lives on `emails.send` and send reads on `analytics.sends`; the
    // top-level `sends` namespace now carries only the lifecycle action
    // `sends.cancel` (no `sends.send` / `sends.list`). The separate
    // per-detail reads (`get`, `sendTest`, `versions`, `duplicate`)
    // collapsed into the single flat read on each resource.
    expect('me' in brew).toBe(false)
    expect('account' in brew).toBe(false)
    expect('integrations' in brew).toBe(false)
    expect('send' in brew.sends).toBe(false)
    expect('list' in brew.sends).toBe(false)
    expect('sendTest' in brew.emails).toBe(false)
    expect('get' in brew.analytics.sends).toBe(false)
    expect('versions' in brew.automations).toBe(false)
  })

  it('runs a full upsert-then-fetch happy path through contacts', async () => {
    server.use(
      http.post('https://brew.new/api/v1/contacts', async ({ request }) => {
        const body = (await request.json()) as { email: string }
        return HttpResponse.json(
          {
            contact: {
              email: body.email,
              firstName: 'Jane',
              subscribed: true,
              suppressed: false,
              createdAt: '2026-04-08T12:00:00.000Z',
              updatedAt: '2026-04-08T12:00:00.000Z',
              customFields: { plan: 'enterprise' },
            },
            created: true,
            fieldsCreated: ['plan'],
            warnings: [],
          },
          {
            status: 201,
            headers: { 'x-request-id': 'req_upsert_1' },
          }
        )
      }),
      http.post('https://brew.new/api/v1/contacts/search', () => {
        return HttpResponse.json({
          data: [
            {
              email: 'jane@example.com',
              firstName: 'Jane',
              subscribed: true,
              suppressed: false,
              createdAt: '2026-04-08T12:00:00.000Z',
              updatedAt: '2026-04-08T12:00:00.000Z',
              customFields: { plan: 'enterprise' },
            },
          ],
          pagination: { limit: 50, cursor: null, hasMore: false },
        })
      })
    )

    const brew = makeIntegrationClient()

    const upserted = await brew.contacts.upsert({
      email: 'jane@example.com',
      firstName: 'Jane',
      customFields: { plan: 'enterprise' },
    })
    expect(upserted.contact.email).toBe('jane@example.com')
    expect(upserted.contact.customFields).toEqual({ plan: 'enterprise' })
    expect(upserted.created).toBe(true)

    // Reads are flat: look one contact up via the single search read.
    const found = await brew.contacts.search({
      filters: [
        { field: 'email', operator: 'equals', value: 'jane@example.com' },
      ],
    })
    expect(found.data[0]?.email).toBe('jane@example.com')
    expect(found.data[0]?.firstName).toBe('Jane')
  })

  it('throws BrewApiError on 4xx with requestId and code preserved', async () => {
    server.use(
      http.post('https://brew.new/api/v1/contacts/search', () => {
        return HttpResponse.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              type: 'invalid_request',
              message: 'Request validation failed.',
              suggestion: 'Fix the field reported in `param` and retry.',
              docs: 'https://docs.getbrew.io/api/contacts#errors',
              param: 'filters',
            },
          },
          {
            status: 400,
            headers: { 'x-request-id': 'req_missing_1' },
          }
        )
      })
    )

    const brew = makeIntegrationClient()

    try {
      await brew.contacts.search({
        filters: [{ field: 'bogus', operator: 'nope', value: 'x' }],
      })
      expect.fail('expected BrewApiError to be thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(BrewApiError)
      const asError = error as BrewApiError
      expect(asError.status).toBe(400)
      expect(asError.code).toBe('INVALID_REQUEST')
      expect(asError.requestId).toBe('req_missing_1')
    }
  })

  it('lists fields end-to-end via brew.fields.list()', async () => {
    server.use(
      http.get('https://brew.new/api/v1/fields', () => {
        return HttpResponse.json({
          data: [
            { fieldName: 'plan', fieldType: 'string', isCore: false },
            { fieldName: 'signupDate', fieldType: 'date', isCore: false },
          ],
          pagination: { limit: 100, cursor: null, hasMore: false },
        })
      })
    )

    const brew = makeIntegrationClient()
    const result = await brew.fields.list()

    expect(result.data).toHaveLength(2)
    expect(result.data[0]?.fieldName).toBe('plan')
    expect(result.data[0]?.fieldType).toBe('string')
  })
})
