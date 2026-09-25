import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  PREVIEW_EMAIL_CLIENTS_DEFAULT_TIMEOUT_MS,
  createPreviewEmailClients,
} from '../../../src/resources/emails/client-previews'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

/** The job admission answers with: queued, nothing rendered yet. */
const READY_BODY = {
  previewId: 'prv_123',
  emailId: 'email_existing',
  status: 'queued',
  previews: [
    {
      id: 'gmailcom-lm_chrcurrent_win10',
      label: 'Gmail (Web)',
      category: 'gmail',
      os: 'Web',
      dark: false,
      status: 'running',
      imageUrl: null,
      reason: 'pending',
      retryable: false,
    },
  ],
  pending: ['gmailcom-lm_chrcurrent_win10'],
  createdAt: '2026-09-24T10:00:00.000Z',
  expiresAt: '2026-10-24T10:00:00.000Z',
  nextPollAfterMs: 15_000,
  credits: { cost: 10, status: 'reserved' },
}

describe('emails.previewClients', () => {
  it('sends POST /v1/emails/{emailId}/client-previews with the body and returns the admitted job', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/emails/email_existing/client-previews',
        async ({ request }) => {
          capturedRequest = request.clone()
          capturedBody = await request.json()
          return HttpResponse.json(READY_BODY, { status: 202 })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const previewClients = createPreviewEmailClients(client)

    const result = await previewClients({
      emailId: 'email_existing',
      clients: ['gmailcom-lm_chrcurrent_win10'],
    })

    expect(capturedRequest?.method).toBe('POST')
    expect(capturedRequest?.url).toBe(
      'https://brew.new/api/v1/emails/email_existing/client-previews'
    )
    // emailId must NOT be in the body — it lives on the URL.
    expect(capturedBody).toEqual({
      clients: ['gmailcom-lm_chrcurrent_win10'],
    })
    expect(result.emailId).toBe('email_existing')
    expect(result.previewId).toBe('prv_123')
    expect(result.status).toBe('queued')
    expect(result.nextPollAfterMs).toBe(15_000)
    expect(result.credits.status).toBe('reserved')
  })

  it('sends an empty JSON body for the default client spread', async () => {
    let capturedBody: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/emails/abc/client-previews',
        async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({ ...READY_BODY, emailId: 'abc' })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const previewClients = createPreviewEmailClients(client)
    await previewClients({ emailId: 'abc' })
    expect(capturedBody).toEqual({})
  })

  it('encodes the emailId path segment so unusual ids are safe on the wire', async () => {
    let captured: string | undefined
    server.use(
      http.post(
        'https://brew.new/api/v1/emails/:emailId/client-previews',
        ({ params }) => {
          captured = String(params.emailId)
          return HttpResponse.json({ ...READY_BODY, emailId: 'odd id' })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const previewClients = createPreviewEmailClients(client)
    await previewClients({ emailId: 'odd id' })
    expect(captured).toBe('odd id')
  })

  it('exposes X-Credit-Cost via { raw: true }', async () => {
    server.use(
      http.post('https://brew.new/api/v1/emails/abc/client-previews', () =>
        HttpResponse.json(
          { ...READY_BODY, emailId: 'abc' },
          {
            headers: {
              'X-Credit-Cost': '10',
              'X-Credits-Remaining': '490',
            },
          }
        )
      )
    )
    const { client } = makeTestHttpClient()
    const previewClients = createPreviewEmailClients(client)
    const raw = await previewClients({ emailId: 'abc' }, { raw: true })
    expect(raw.status).toBe(200)
    expect(raw.headers.get('x-credit-cost')).toBe('10')
    expect(raw.data.previews).toHaveLength(1)
  })

  it('keeps a 90s ceiling on the admission call', () => {
    expect(PREVIEW_EMAIL_CLIENTS_DEFAULT_TIMEOUT_MS).toBe(90_000)
  })

  it('surfaces a retryable 503 as a BrewApiError', async () => {
    server.use(
      http.post('https://brew.new/api/v1/emails/abc/client-previews', () =>
        HttpResponse.json(
          {
            error: {
              code: 'SERVICE_UNAVAILABLE',
              type: 'service_unavailable',
              message: 'The preview service is temporarily unavailable.',
              suggestion: 'Retry in a few seconds.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 503, headers: { 'Retry-After': '5' } }
        )
      )
    )
    // maxRetries: 0 so the test asserts the surfaced error rather than
    // exercising the retry loop (covered by core/http tests).
    const { client } = makeTestHttpClient({
      configOverrides: { maxRetries: 0 },
    })
    const previewClients = createPreviewEmailClients(client)
    await expect(previewClients({ emailId: 'abc' })).rejects.toMatchObject({
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
    })
  })
})
