import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetEmailClientPreview } from '../../../src/resources/emails/get-client-preview'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const JOB = {
  previewId: 'prv_123',
  emailId: 'email_123',
  status: 'partially_completed',
  previews: [
    {
      id: 'gmailcom-lm_chrcurrent_win10',
      label: 'Gmail (Web)',
      category: 'gmail',
      os: 'Windows',
      dark: false,
      status: 'completed',
      imageUrl: 'https://cdn.brew.new/previews/prv_123/gmail.png',
      retryable: false,
    },
    {
      id: 'outlook2021_win11_lm_dt',
      label: 'Outlook 2021 (Windows)',
      category: 'outlook',
      os: 'Windows',
      dark: false,
      status: 'failed',
      imageUrl: null,
      reason: 'render_failed',
      retryable: true,
    },
  ],
  pending: [],
  createdAt: '2026-09-24T10:00:00.000Z',
  expiresAt: '2026-10-24T10:00:00.000Z',
  nextPollAfterMs: 0,
  credits: { cost: 10, status: 'settled' },
}

describe('emails.getClientPreview', () => {
  it('GETs /v1/emails/client-previews/{previewId} and returns the job', async () => {
    let url: string | undefined
    let method: string | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/emails/client-previews/prv_123',
        ({ request }) => {
          url = request.url
          method = request.method
          return HttpResponse.json(JOB)
        }
      )
    )

    const { client } = makeTestHttpClient()
    const job = await createGetEmailClientPreview(client)('prv_123')

    expect(method).toBe('GET')
    expect(new URL(url!).pathname).toBe(
      '/api/v1/emails/client-previews/prv_123'
    )
    expect(job.status).toBe('partially_completed')
    expect(job.previews[1]?.reason).toBe('render_failed')
    expect(job.credits.status).toBe('settled')
  })

  it('encodes the previewId path segment', async () => {
    let url: string | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/emails/client-previews/:previewId',
        ({ request }) => {
          url = request.url
          return HttpResponse.json(JOB)
        }
      )
    )

    const { client } = makeTestHttpClient()
    await createGetEmailClientPreview(client)('odd id')

    expect(new URL(url!).pathname).toBe(
      '/api/v1/emails/client-previews/odd%20id'
    )
  })
})
