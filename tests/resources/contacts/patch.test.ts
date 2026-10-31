import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createPatchContact } from '../../../src/resources/contacts/patch'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('contacts.patch', () => {
  it('sends PATCH /v1/contacts/{email} with a { fields } body and returns the patch envelope', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.patch(
        'https://brew.new/api/v1/contacts/jane%40example.com',
        async ({ request }) => {
          capturedRequest = request.clone()
          capturedBody = await request.json()
          return HttpResponse.json({
            contact: {
              email: 'jane@example.com',
              firstName: 'Jane',
              subscribed: true,
              suppressed: false,
              createdAt: '2026-04-08T12:00:00.000Z',
              updatedAt: '2026-04-08T12:05:00.000Z',
              customFields: { plan: 'pro' },
            },
            updated: ['firstName', 'customFields.plan'],
            warnings: [],
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const patch = createPatchContact(client)

    const result = await patch({
      email: 'jane@example.com',
      fields: {
        firstName: 'Jane',
        'customFields.plan': 'pro',
      },
    })

    expect(capturedRequest?.method).toBe('PATCH')
    expect(new URL(capturedRequest!.url).pathname).toBe(
      '/api/v1/contacts/jane%40example.com'
    )
    // email travels on the URL; only { fields } is sent in the body.
    expect(capturedBody).toEqual({
      fields: {
        firstName: 'Jane',
        'customFields.plan': 'pro',
      },
    })
    expect(result.contact.email).toBe('jane@example.com')
    expect(result.contact.firstName).toBe('Jane')
    expect(result.contact.customFields).toEqual({ plan: 'pro' })
    expect(result.updated).toEqual(['firstName', 'customFields.plan'])
    expect(result.warnings).toEqual([])
  })

  it('returns the warnings and an empty updated array the server sends', async () => {
    const warnings = [
      {
        code: 'FIELD_TYPE_COERCED',
        email: 'jane@example.com',
        field: 'seats',
        from: 'string',
        to: 'number',
        message: 'seats was converted from string to number.',
      },
      {
        code: 'DATE_ORDER_ASSUMED',
        email: 'jane@example.com',
        field: 'renewalDate',
        message: '03/04/2026 was read month/day. Send YYYY-MM-DD.',
      },
    ]
    server.use(
      http.patch('https://brew.new/api/v1/contacts/jane%40example.com', () =>
        HttpResponse.json({
          contact: {
            email: 'jane@example.com',
            subscribed: true,
            suppressed: false,
            createdAt: '2026-04-08T12:00:00.000Z',
            updatedAt: '2026-04-08T12:00:00.000Z',
            customFields: { seats: 12, renewalDate: 1775174400000 },
          },
          updated: [],
          warnings,
        })
      )
    )

    const { client } = makeTestHttpClient()
    const patch = createPatchContact(client)

    const result = await patch({
      email: 'jane@example.com',
      fields: { seats: '12', renewalDate: '03/04/2026' },
    })

    expect(result.updated).toEqual([])
    expect(result.warnings).toEqual(warnings)
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'FIELD_TYPE_COERCED',
      'DATE_ORDER_ASSUMED',
    ])
  })
})
