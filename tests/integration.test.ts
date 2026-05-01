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
    expect(typeof brew.contacts.list).toBe('function')
    expect(typeof brew.contacts.count).toBe('function')
    expect(typeof brew.contacts.getByEmail).toBe('function')
    expect(typeof brew.contacts.upsert).toBe('function')
    expect(typeof brew.contacts.upsertMany).toBe('function')
    expect(typeof brew.contacts.patch).toBe('function')
    expect(typeof brew.contacts.delete).toBe('function')
    expect(typeof brew.contacts.deleteMany).toBe('function')

    expect(typeof brew.domains.list).toBe('function')
    expect(typeof brew.emails.list).toBe('function')
    expect(typeof brew.emails.generate).toBe('function')
    expect(typeof brew.fields.list).toBe('function')
    expect(typeof brew.fields.create).toBe('function')
    expect(typeof brew.fields.delete).toBe('function')
    expect(typeof brew.sends.create).toBe('function')
    expect(typeof brew.templates.list).toBe('function')
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
              createdAt: 1712592000000,
              updatedAt: 1712592000000,
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
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        const url = new URL(request.url)
        const email = url.searchParams.get('email')
        if (email !== 'jane@example.com') {
          return HttpResponse.json(
            {
              error: {
                code: 'CONTACT_NOT_FOUND',
                type: 'not_found',
                message: 'missing',
                suggestion: 'Use POST /api/v1/contacts to create one first.',
                docs: 'https://docs.getbrew.io/api/contacts#errors',
              },
            },
            { status: 404 }
          )
        }
        return HttpResponse.json({
          contact: {
            email: 'jane@example.com',
            firstName: 'Jane',
            subscribed: true,
            suppressed: false,
            createdAt: 1712592000000,
            updatedAt: 1712592000000,
            customFields: { plan: 'enterprise' },
          },
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

    const fetched = await brew.contacts.getByEmail({
      email: 'jane@example.com',
    })
    expect(fetched.email).toBe('jane@example.com')
    expect(fetched.firstName).toBe('Jane')
  })

  it('throws BrewApiError on 404 with requestId and code preserved', async () => {
    server.use(
      http.get('https://brew.new/api/v1/contacts', () => {
        return HttpResponse.json(
          {
            error: {
              code: 'CONTACT_NOT_FOUND',
              type: 'not_found',
              message: 'No contact with that email exists',
              suggestion: 'Use POST /api/v1/contacts to create one first.',
              docs: 'https://docs.getbrew.io/api/contacts#errors',
              param: 'email',
            },
          },
          {
            status: 404,
            headers: { 'x-request-id': 'req_missing_1' },
          }
        )
      })
    )

    const brew = makeIntegrationClient()

    try {
      await brew.contacts.getByEmail({ email: 'missing@example.com' })
      expect.fail('expected BrewApiError to be thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(BrewApiError)
      const asError = error as BrewApiError
      expect(asError.status).toBe(404)
      expect(asError.code).toBe('CONTACT_NOT_FOUND')
      expect(asError.requestId).toBe('req_missing_1')
    }
  })

  it('lists fields end-to-end via brew.fields.list()', async () => {
    server.use(
      http.get('https://brew.new/api/v1/fields', () => {
        return HttpResponse.json({
          fields: [
            { fieldName: 'plan', fieldType: 'string', isCore: false },
            { fieldName: 'signupDate', fieldType: 'date', isCore: false },
          ],
        })
      })
    )

    const brew = makeIntegrationClient()
    const result = await brew.fields.list()

    expect(result.fields).toHaveLength(2)
    expect(result.fields[0]?.fieldName).toBe('plan')
    expect(result.fields[0]?.fieldType).toBe('string')
  })
})
