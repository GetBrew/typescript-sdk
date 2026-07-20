import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  createCreateInboxPlacementTest,
  createGetInboxPlacementResults,
} from '../../../src/resources/emails/inbox-placement'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('emails inbox placement', () => {
  it('creates a test with emailId on the path and domain settings in the body', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/emails/email%2F123/inbox-placement-tests',
        async ({ request }) => {
          capturedRequest = request.clone()
          capturedBody = await request.json()
          return HttpResponse.json(
            {
              testId: 'placement_123',
              emailId: 'email/123',
              status: 'collecting',
              results: null,
            },
            { status: 202 }
          )
        }
      )
    )

    const { client } = makeTestHttpClient()
    const createTest = createCreateInboxPlacementTest(client)
    const result = await createTest({
      emailId: 'email/123',
      domainId: 'domain_123',
      subject: 'Placement check',
      previewText: 'Seed run',
    })

    expect(capturedRequest?.headers.get('idempotency-key')).toBeTruthy()
    expect(capturedBody).toEqual({
      domainId: 'domain_123',
      subject: 'Placement check',
      previewText: 'Seed run',
    })
    expect(result).toMatchObject({
      testId: 'placement_123',
      status: 'collecting',
    })
  })

  it('reads one live result by testId', async () => {
    let capturedUrl: URL | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/emails/email_123/inbox-placement-tests',
        ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json({
            testId: 'placement_123',
            emailId: 'email_123',
            status: 'completed',
            results: { total: 10, inbox: 8, spam: 1, missing: 1 },
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const getResults = createGetInboxPlacementResults(client)
    const result = await getResults({
      emailId: 'email_123',
      testId: 'placement_123',
    })

    expect(capturedUrl?.searchParams.get('testId')).toBe('placement_123')
    expect('testId' in result && result.testId).toBe('placement_123')
  })
})
