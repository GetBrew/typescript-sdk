import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { BrewApiError, type BrewClient, createBrewClient } from '../src/index'

import { server } from './msw/server'

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
    expect(typeof brew.audiences.fromEvents).toBe('function')
    expect(typeof brew.audiences.duplicate).toBe('function')
    expect(typeof brew.contacts.search).toBe('function')
    expect(typeof brew.contacts.searchAll).toBe('function')
    expect(typeof brew.contacts.count).toBe('function')
    expect(typeof brew.contacts.upsert).toBe('function')
    expect(typeof brew.contacts.upsertMany).toBe('function')
    expect(typeof brew.contacts.patch).toBe('function')
    expect(typeof brew.contacts.delete).toBe('function')
    expect(typeof brew.contacts.deleteMany).toBe('function')

    expect(typeof brew.domains.list).toBe('function')
    expect(typeof brew.audiences.list).toBe('function')
    expect(typeof brew.automations.list).toBe('function')
    expect(typeof brew.emails.list).toBe('function')
    expect(typeof brew.emails.generate).toBe('function')
    expect(typeof brew.emails.import).toBe('function')
    expect(typeof brew.emails.auditEmail).toBe('function')
    expect(typeof brew.fields.list).toBe('function')
    expect(typeof brew.fields.create).toBe('function')
    expect(typeof brew.fields.delete).toBe('function')
    expect(typeof brew.emails.send).toBe('function')
    expect(typeof brew.sends.cancel).toBe('function')
    expect(typeof brew.templates.list).toBe('function')
    expect(typeof brew.usage.get).toBe('function')
    expect(typeof brew.emailGroups.list).toBe('function')
    expect(typeof brew.emailGroups.create).toBe('function')
    expect(typeof brew.emailGroups.update).toBe('function')
    expect(typeof brew.emailGroups.delete).toBe('function')
    expect(typeof brew.integrations.list).toBe('function')
    expect(typeof brew.integrations.events.list).toBe('function')
    expect(typeof brew.integrations.events.get).toBe('function')
    expect(typeof brew.apiKeys.list).toBe('function')
    expect(typeof brew.apiKeys.create).toBe('function')
    expect(typeof brew.apiKeys.revoke).toBe('function')

    expect(typeof brew.sends.list).toBe('function')
    expect(typeof brew.sends.get).toBe('function')
    expect(typeof brew.automations.triggers.list).toBe('function')
    expect(typeof brew.automations.triggers.get).toBe('function')
    expect(typeof brew.automations.triggers.fire).toBe('function')
    expect(typeof brew.automations.triggers.readiness).toBe('function')
    expect(typeof brew.automations.triggers.ensureIntegrationEvent).toBe(
      'function'
    )
    expect(typeof brew.automations.runs.list).toBe('function')
    expect(typeof brew.automations.runs.get).toBe('function')
    expect(typeof brew.automations.runs.cancel).toBe('function')
    expect(typeof brew.automations.audienceRuns.get).toBe('function')
    expect(typeof brew.automations.audienceRuns.pause).toBe('function')
    expect(typeof brew.automations.audienceRuns.resume).toBe('function')
    expect(typeof brew.automations.audienceRuns.cancel).toBe('function')
    expect(typeof brew.automations.triggerInstances.list).toBe('function')
    expect(typeof brew.automations.triggerInstances.get).toBe('function')

    expect(typeof brew.audiences.get).toBe('function')
    expect(typeof brew.automations.get).toBe('function')
    expect(typeof brew.contacts.list).toBe('function')
    expect(typeof brew.contacts.get).toBe('function')
    expect(typeof brew.domains.get).toBe('function')
    expect(Object.keys(brew.domains.unsubscribes).sort()).toEqual([
      'add',
      'export',
      'import',
      'list',
      'remove',
    ])
    expect(typeof brew.emailGroups.get).toBe('function')
    expect(typeof brew.emails.get).toBe('function')
    expect(typeof brew.emails.inboxPlacementTests.get).toBe('function')
    expect(Object.keys(brew.insights).sort()).toEqual(['get', 'list'])
    expect(Object.keys(brew.chats).sort()).toEqual(['get', 'list', 'listAll'])
    expect(Object.keys(brew.notifications).sort()).toEqual(['list', 'listAll'])
    expect(Object.keys(brew.emails.comments).sort()).toEqual([
      'list',
      'listAllMessages',
    ])
    expect(typeof brew.fields.get).toBe('function')

    expect('me' in brew).toBe(false)
    expect('account' in brew).toBe(false)
    expect('send' in brew.sends).toBe(false)
    expect('sendTest' in brew.emails).toBe(false)
    const removedAuditMethod = ['audit', 'Access', 'ibility'].join('')
    expect(removedAuditMethod in brew.emails).toBe(false)
    expect('versions' in brew.automations).toBe(false)
    expect(Object.keys(brew.analytics).sort()).toEqual([
      'automations',
      'eventCounts',
      'events',
      'eventsAll',
      'overview',
    ])
    expect('campaigns' in brew.analytics).toBe(false)
    expect('sends' in brew.analytics).toBe(false)
    expect('triggerInstances' in brew.analytics).toBe(false)
    expect('ready' in brew.automations.triggers).toBe(false)
    expect('control' in brew.automations.audienceRuns).toBe(false)
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
      http.post('https://brew.new/api/v1/contacts/search', () =>
        HttpResponse.json({
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
      )
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
      http.post('https://brew.new/api/v1/contacts/search', () =>
        HttpResponse.json(
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
      )
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
      http.get('https://brew.new/api/v1/fields', () =>
        HttpResponse.json({
          data: [
            { fieldName: 'plan', fieldType: 'string', isCore: false },
            { fieldName: 'signupDate', fieldType: 'date', isCore: false },
          ],
          pagination: { limit: 100, cursor: null, hasMore: false },
        })
      )
    )

    const brew = makeIntegrationClient()
    const result = await brew.fields.list()

    expect(result.data).toHaveLength(2)
    expect(result.data[0]?.fieldName).toBe('plan')
    expect(result.data[0]?.fieldType).toBe('string')
  })
})
