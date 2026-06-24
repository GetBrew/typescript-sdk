import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createSendTestEmail } from '../../../src/resources/emails/send-test'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('emails.sendTest', () => {
  it('POSTs /v1/sends/test and returns { status:sent, recipient }', async () => {
    let body: unknown
    let captured: Request | undefined
    server.use(
      http.post('https://brew.new/api/v1/sends/test', async ({ request }) => {
        captured = request.clone()
        body = await request.json()
        return HttpResponse.json(
          { status: 'sent', recipient: 'qa@example.com' },
          { status: 200 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const sendTest = createSendTestEmail(client)

    const result = await sendTest({
      emailId: 'eml_1',
      subject: 'Preview',
      to: 'qa@example.com',
    })

    expect(new URL(captured!.url).pathname).toBe('/api/v1/sends/test')
    expect(body).toEqual({
      emailId: 'eml_1',
      subject: 'Preview',
      to: 'qa@example.com',
    })
    // POST auto-attaches an idempotency key so the test send is retry-safe.
    expect(captured?.headers.get('idempotency-key')).toBeTruthy()
    expect(result.status).toBe('sent')
    expect(result.recipient).toBe('qa@example.com')
  })
})
