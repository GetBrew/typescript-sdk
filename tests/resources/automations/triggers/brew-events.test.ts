import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { BrewApiError } from '../../../../src/core/errors'
import { createTriggersResource } from '../../../../src/resources/automations/triggers/resource'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

const BREW_EVENTS_URL =
  'https://brew.new/api/v1/automations/triggers/brew-events'

const SAVED_ROW = {
  triggerEventId: 'trg_news',
  title: 'Unsubscribed from news.acme.com',
  description:
    'Starts when a contact unsubscribes from emails sent from news.acme.com.',
  provider: 'brew_event' as const,
  providerEventKey: 'contact.unsubscribed',
  brewEvent: {
    event: 'contact.unsubscribed' as const,
    scope: 'domain' as const,
    domainHost: 'news.acme.com',
  },
  payloadSchema: {
    type: 'object' as const,
    fields: [{ key: 'email', type: 'string' as const, required: true }],
  },
  createdAt: '2026-10-13T12:00:00.000Z',
  updatedAt: '2026-10-13T12:00:00.000Z',
}

describe('automations.triggers.ensureBrewEvent', () => {
  it('POSTs the scope to /v1/automations/triggers/brew-events and returns the new row', async () => {
    let capturedBody: unknown
    let capturedKey: string | null = null
    server.use(
      http.post(BREW_EVENTS_URL, async ({ request }) => {
        capturedBody = await request.json()
        capturedKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json(
          { ...SAVED_ROW, created: true },
          { status: 201 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    const result = await triggers.ensureBrewEvent({
      event: 'contact.unsubscribed',
      scope: 'domain',
      domainId: 'dom_news',
    })

    expect(capturedBody).toEqual({
      event: 'contact.unsubscribed',
      scope: 'domain',
      domainId: 'dom_news',
    })
    // A POST carries a key so a retry after a lost answer replays.
    expect(capturedKey).toEqual(expect.any(String))
    expect(result).toMatchObject({
      triggerEventId: 'trg_news',
      provider: 'brew_event',
      brewEvent: { scope: 'domain', domainHost: 'news.acme.com' },
      created: true,
    })
  })

  it('returns the existing row with created: false for a scope the brand already has', async () => {
    server.use(
      http.post(BREW_EVENTS_URL, () =>
        HttpResponse.json(
          {
            ...SAVED_ROW,
            triggerEventId: 'trg_all',
            title: 'Unsubscribed from all emails',
            brewEvent: { event: 'contact.unsubscribed', scope: 'all' },
            created: false,
          },
          { status: 200 }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const result = await createTriggersResource(client).ensureBrewEvent({
      event: 'contact.unsubscribed',
      scope: 'all',
    })

    expect(result.created).toBe(false)
    expect(result.brewEvent).toEqual({
      event: 'contact.unsubscribed',
      scope: 'all',
    })
  })

  it('surfaces a transactional domain as a typed DOMAIN_PURPOSE_NOT_ALLOWED error', async () => {
    server.use(
      http.post(BREW_EVENTS_URL, () =>
        HttpResponse.json(
          {
            error: {
              code: 'DOMAIN_PURPOSE_NOT_ALLOWED',
              type: 'invalid_request',
              message:
                'mail.acme.com is a transactional domain. Only marketing domains have an unsubscribe list.',
              param: 'domainId',
            },
          },
          { status: 422 }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const failure = await createTriggersResource(client)
      .ensureBrewEvent({
        event: 'contact.unsubscribed',
        scope: 'domain',
        domainId: 'dom_tx',
      })
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BrewApiError)
    expect(failure).toMatchObject({
      status: 422,
      code: 'DOMAIN_PURPOSE_NOT_ALLOWED',
    })
  })

  it('answers the raw response with its status on raw: true', async () => {
    server.use(
      http.post(BREW_EVENTS_URL, () =>
        HttpResponse.json({ ...SAVED_ROW, created: true }, { status: 201 })
      )
    )

    const { client } = makeTestHttpClient()
    const raw = await createTriggersResource(client).ensureBrewEvent(
      { event: 'contact.unsubscribed', scope: 'domain', domainId: 'dom_news' },
      { raw: true }
    )

    expect(raw.status).toBe(201)
    expect(raw.data.created).toBe(true)
  })
})
