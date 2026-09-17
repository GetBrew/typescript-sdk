import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createInboxPlacementTestsResource } from '../../../../src/resources/emails/inbox-placement-tests/resource'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

describe('emails.inboxPlacementTests', () => {
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
              status: 'queued',
              phase: 'sending',
              domainId: 'domain_123',
              seedCount: 10,
              results: null,
              createdAt: '2026-04-08T12:00:00.000Z',
              updatedAt: '2026-04-08T12:00:00.000Z',
            },
            { status: 202 }
          )
        }
      )
    )

    const { client } = makeTestHttpClient()
    const tests = createInboxPlacementTestsResource(client)
    const result = await tests.create({
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
    // One v1 status vocabulary; `collecting` is a `phase`, not a status.
    expect(result).toMatchObject({ testId: 'placement_123', status: 'queued' })
    expect(result.phase).toBe('sending')
  })

  it('reads ONE test from its own route, not a ?testId filter', async () => {
    let capturedUrl: URL | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/emails/email_123/inbox-placement-tests/placement_123',
        ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json({
            testId: 'placement_123',
            emailId: 'email_123',
            status: 'completed',
            domainId: 'domain_123',
            seedCount: 10,
            results: null,
            createdAt: '2026-04-08T12:00:00.000Z',
            updatedAt: '2026-04-08T12:05:00.000Z',
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const tests = createInboxPlacementTestsResource(client)
    const result = await tests.get('email_123', 'placement_123')

    expect(capturedUrl?.pathname).toBe(
      '/api/v1/emails/email_123/inbox-placement-tests/placement_123'
    )
    expect(capturedUrl?.searchParams.get('testId')).toBeNull()
    expect(result.testId).toBe('placement_123')
    expect(result.status).toBe('completed')
  })

  it('lists a design recent tests under the { data, pagination } envelope', async () => {
    let capturedUrl: URL | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/emails/email_123/inbox-placement-tests',
        ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json({
            data: [
              {
                testId: 'placement_123',
                status: 'completed',
                domainId: 'domain_123',
                subject: 'Placement check',
                seedCount: 10,
                overall: null,
                createdAt: '2026-04-08T12:00:00.000Z',
                updatedAt: '2026-04-08T12:05:00.000Z',
              },
            ],
            pagination: { limit: 20, cursor: null, hasMore: false },
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const tests = createInboxPlacementTestsResource(client)
    const result = await tests.list({ emailId: 'email_123', limit: 20 })

    expect(capturedUrl?.pathname).toBe(
      '/api/v1/emails/email_123/inbox-placement-tests'
    )
    expect(capturedUrl?.searchParams.get('limit')).toBe('20')
    expect(result.data[0]?.testId).toBe('placement_123')
    expect(result.pagination.hasMore).toBe(false)
  })
})
