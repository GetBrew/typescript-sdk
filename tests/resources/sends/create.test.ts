import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createCreateSend } from '../../../src/resources/sends/create'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('sends.create', () => {
  it('sends POST /v1/sends with audience mode and returns the accepted response', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/sends', async ({ request }) => {
        capturedRequest = request.clone()
        capturedBody = await request.json()
        return HttpResponse.json(
          {
            status: 'queued',
            runId: 'wf_123',
          },
          { status: 202 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const create = createCreateSend(client)

    const result = await create({
      emailId: 'email_123',
      domainId: 'domain_123',
      subject: 'Welcome to Brew',
      previewText: 'Quick intro',
      replyTo: 'hello@example.com',
      audienceId: 'aud_123',
    })

    expect(capturedRequest?.method).toBe('POST')
    expect(capturedBody).toEqual({
      emailId: 'email_123',
      domainId: 'domain_123',
      subject: 'Welcome to Brew',
      previewText: 'Quick intro',
      replyTo: 'hello@example.com',
      audienceId: 'aud_123',
    })
    expect(capturedRequest?.headers.get('idempotency-key')).toBeTruthy()
    expect(result).toEqual({
      status: 'queued',
      runId: 'wf_123',
    })
  })

  it('uses a caller provided idempotency key and supports manual emails plus scheduling', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/sends', async ({ request }) => {
        capturedRequest = request.clone()
        capturedBody = await request.json()
        return HttpResponse.json(
          {
            status: 'scheduled',
            runId: 'wf_456',
            scheduledAt: '2099-01-01T00:00:00.000Z',
          },
          { status: 202 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const create = createCreateSend(client)

    const result = await create(
      {
        emailId: 'email_456',
        domainId: 'domain_456',
        subject: 'Scheduled launch',
        emails: ['ada@example.com', 'grace@example.com'],
        scheduledAt: '2099-01-01T00:00:00.000Z',
      },
      { idempotencyKey: 'send-001' }
    )

    expect(capturedBody).toEqual({
      emailId: 'email_456',
      domainId: 'domain_456',
      subject: 'Scheduled launch',
      emails: ['ada@example.com', 'grace@example.com'],
      scheduledAt: '2099-01-01T00:00:00.000Z',
    })
    expect(capturedRequest?.headers.get('idempotency-key')).toBe('send-001')
    expect(result).toEqual({
      status: 'scheduled',
      runId: 'wf_456',
      scheduledAt: '2099-01-01T00:00:00.000Z',
    })
  })
})
