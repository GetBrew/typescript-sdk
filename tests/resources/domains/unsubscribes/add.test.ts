import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createDomainsResource } from '../../../../src/resources/domains/resource'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

const ADD_RESPONSE = {
  domainId: 'dom_123',
  domainHost: 'send.example.com',
  summary: {
    received: 3,
    added: 1,
    alreadyUnsubscribed: 1,
    created: 0,
    invalid: 1,
  },
  invalid: [{ email: 'not-an-address', code: 'INVALID_EMAIL' }],
}

describe('domains.unsubscribes.add', () => {
  it('POSTs the addresses with domainId on the path and an idempotency key', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/domains/dom%2F123/unsubscribes',
        async ({ request }) => {
          capturedRequest = request.clone()
          capturedBody = await request.json()
          return HttpResponse.json(ADD_RESPONSE)
        }
      )
    )

    const { client } = makeTestHttpClient()
    const domains = createDomainsResource(client)

    const result = await domains.unsubscribes.add({
      domainId: 'dom/123',
      emails: ['jane@example.com', 'sam@example.com', 'not-an-address'],
    })

    expect(capturedRequest?.method).toBe('POST')
    expect(new URL(capturedRequest!.url).pathname).toBe(
      '/api/v1/domains/dom%2F123/unsubscribes'
    )
    // POSTs are only retry-safe with a key; one is generated when omitted.
    expect(capturedRequest?.headers.get('idempotency-key')).toBeTruthy()
    expect(capturedBody).toEqual({
      emails: ['jane@example.com', 'sam@example.com', 'not-an-address'],
    })
    expect(result.summary.added).toBe(1)
    expect(result.invalid[0]?.code).toBe('INVALID_EMAIL')
  })

  it('honors a caller-supplied idempotency key', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.post(
        'https://brew.new/api/v1/domains/dom_123/unsubscribes',
        ({ request }) => {
          capturedRequest = request.clone()
          return HttpResponse.json(ADD_RESPONSE)
        }
      )
    )

    const { client } = makeTestHttpClient()
    const domains = createDomainsResource(client)

    await domains.unsubscribes.add(
      { domainId: 'dom_123', emails: ['jane@example.com'] },
      { idempotencyKey: 'unsubscribe-001' }
    )

    expect(capturedRequest?.headers.get('idempotency-key')).toBe(
      'unsubscribe-001'
    )
  })
})
