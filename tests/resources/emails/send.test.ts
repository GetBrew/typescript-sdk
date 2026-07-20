import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createSendEmail } from '../../../src/resources/emails/send'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('emails.send', () => {
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
    const send = createSendEmail(client)

    const result = await send({
      emailId: 'email_123',
      domainId: 'domain_123',
      messageClass: 'marketing',
      subject: 'Welcome to Brew',
      previewText: 'Quick intro',
      replyTo: 'hello@example.com',
      audienceId: 'aud_123',
    })

    expect(new URL(capturedRequest!.url).pathname).toBe('/api/v1/sends')
    expect(capturedRequest?.method).toBe('POST')
    expect(capturedBody).toEqual({
      emailId: 'email_123',
      domainId: 'domain_123',
      messageClass: 'marketing',
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
    const send = createSendEmail(client)

    const result = await send(
      {
        emailId: 'email_456',
        domainId: 'domain_456',
        messageClass: 'marketing',
        subject: 'Scheduled launch',
        audienceId: 'audience_456',
        scheduledAt: '2099-01-01T00:00:00.000Z',
      },
      { idempotencyKey: 'send-001' }
    )

    expect(capturedBody).toEqual({
      emailId: 'email_456',
      domainId: 'domain_456',
      messageClass: 'marketing',
      subject: 'Scheduled launch',
      audienceId: 'audience_456',
      scheduledAt: '2099-01-01T00:00:00.000Z',
    })
    expect(capturedRequest?.headers.get('idempotency-key')).toBe('send-001')
    expect(result).toEqual({
      status: 'scheduled',
      runId: 'wf_456',
      scheduledAt: '2099-01-01T00:00:00.000Z',
    })
  })

  it('test mode: POSTs /v1/sends with { test: true } and returns the synchronous { status:sent, recipient }', async () => {
    let captured: Request | undefined
    let body: unknown
    server.use(
      // `POST /v1/sends` is polymorphic: `test: true` is a one-off TEST send.
      http.post('https://brew.new/api/v1/sends', async ({ request }) => {
        captured = request.clone()
        body = await request.json()
        return HttpResponse.json(
          { status: 'sent', recipient: 'qa@example.com' },
          { status: 200 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const send = createSendEmail(client)

    const result = await send({
      test: true,
      emailId: 'eml_1',
      subject: 'Preview',
      to: 'qa@example.com',
    })

    expect(new URL(captured!.url).pathname).toBe('/api/v1/sends')
    expect(body).toEqual({
      test: true,
      emailId: 'eml_1',
      subject: 'Preview',
      to: 'qa@example.com',
    })
    expect(result.status).toBe('sent')
    if (result.status === 'sent') {
      expect(result.recipient).toBe('qa@example.com')
    }
  })
})
