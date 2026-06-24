import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createTestSend } from '../../../src/resources/sends/test'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('sends.test', () => {
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
    const testSend = createTestSend(client)

    const result = await testSend({
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
