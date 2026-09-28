import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createPatchContact } from '../../../src/resources/contacts/patch'
import { createUpsertContact } from '../../../src/resources/contacts/upsert'
import { createUpsertManyContacts } from '../../../src/resources/contacts/upsert-many'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const CONSENT = {
  source: 'form' as const,
  capturedAt: '2026-09-28T12:00:00.000Z',
  policyVersion: 'v3',
  evidence: 'Newsletter footer form',
}

const CONTACT = {
  email: 'ada@example.com',
  subscribed: true,
  suppressed: false,
  createdAt: 1712592000000,
  updatedAt: 1712592000000,
  customFields: {},
}

function captureBody(method: 'post' | 'patch', url: string) {
  const captured: { body?: unknown } = {}
  server.use(
    http[method](url, async ({ request }) => {
      captured.body = await request.json()
      return HttpResponse.json(
        method === 'patch'
          ? { contact: CONTACT, updated: [] }
          : {
              contact: CONTACT,
              created: false,
              fieldsCreated: [],
              warnings: [],
            }
      )
    })
  )
  return captured
}

describe('contact consent records', () => {
  it('upsert sends consent with the contact', async () => {
    const captured = captureBody('post', 'https://brew.new/api/v1/contacts')
    const { client } = makeTestHttpClient()

    await createUpsertContact(client)({
      email: 'ada@example.com',
      consent: CONSENT,
    })

    expect(captured.body).toEqual({
      email: 'ada@example.com',
      consent: CONSENT,
    })
  })

  it('upsertMany sends a batch default and a per-row consent', async () => {
    const captured = captureBody('post', 'https://brew.new/api/v1/contacts')
    const { client } = makeTestHttpClient()

    await createUpsertManyContacts(client)({
      contacts: [
        { email: 'ada@example.com' },
        { email: 'bo@example.com', consent: { source: 'api' } },
      ],
      consent: CONSENT,
    })

    expect(captured.body).toEqual({
      contacts: [
        { email: 'ada@example.com' },
        { email: 'bo@example.com', consent: { source: 'api' } },
      ],
      consent: CONSENT,
    })
  })

  it('patch sends consent alone, with no empty fields object', async () => {
    const captured = captureBody(
      'patch',
      'https://brew.new/api/v1/contacts/ada%40example.com'
    )
    const { client } = makeTestHttpClient()

    await createPatchContact(client)({
      email: 'ada@example.com',
      consent: CONSENT,
    })

    expect(captured.body).toEqual({ consent: CONSENT })
  })

  it('patch sends fields and consent together', async () => {
    const captured = captureBody(
      'patch',
      'https://brew.new/api/v1/contacts/ada%40example.com'
    )
    const { client } = makeTestHttpClient()

    await createPatchContact(client)({
      email: 'ada@example.com',
      fields: { firstName: 'Ada' },
      consent: CONSENT,
    })

    expect(captured.body).toEqual({
      fields: { firstName: 'Ada' },
      consent: CONSENT,
    })
  })

  it('patch needs fields or consent (type-level)', () => {
    const { client } = makeTestHttpClient()
    const patch = createPatchContact(client)
    // Type-level only: the call is never made.
    // @ts-expect-error — an empty patch names nothing to change
    const call = () => patch({ email: 'ada@example.com' })
    expect(typeof call).toBe('function')
  })
})
