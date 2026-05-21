import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  GENERATE_EMAIL_DEFAULT_TIMEOUT_MS,
  createGenerateEmail,
} from '../../../src/resources/emails/generate'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('emails.generate', () => {
  it('sends POST /v1/emails with the generation body and returns an email artifact response', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/emails', async ({ request }) => {
        capturedRequest = request.clone()
        capturedBody = await request.json()
        return HttpResponse.json({
          emailId: 'email_123',
          emailHtml: '<html><body>Welcome</body></html>',
          emailPng: 'https://cdn.brew.new/email_123.png',
          emailMobilePng: 'https://cdn.brew.new/email_123-mobile.png',
        })
      })
    )

    const { client } = makeTestHttpClient()
    const generate = createGenerateEmail(client)

    const result = await generate({
      prompt: 'Create a welcome email',
      emailType: 'campaign',
      contentUrl: 'https://vercel.com/blog',
      referenceEmailId: 'seed-vercel-newsletter',
    })

    expect(capturedRequest?.method).toBe('POST')
    expect(capturedBody).toEqual({
      prompt: 'Create a welcome email',
      emailType: 'campaign',
      contentUrl: 'https://vercel.com/blog',
      referenceEmailId: 'seed-vercel-newsletter',
    })
    expect(capturedRequest?.headers.get('idempotency-key')).toBeTruthy()
    expect('emailId' in result).toBe(true)
    if ('emailId' in result) {
      expect(result.emailId).toBe('email_123')
      expect(result.emailHtml).toContain('Welcome')
      expect(result.emailPng).toBe('https://cdn.brew.new/email_123.png')
    }
  })

  it('returns the text response shape when no email artifact is produced', async () => {
    server.use(
      http.post('https://brew.new/api/v1/emails', () => {
        return HttpResponse.json({
          response: 'I can help with strategy, but no email was generated.',
        })
      })
    )

    const { client } = makeTestHttpClient()
    const generate = createGenerateEmail(client)

    const result = await generate({
      prompt: 'Explain the campaign strategy only',
      emailType: 'campaign',
    })

    expect('emailId' in result).toBe(false)
    if (!('emailId' in result)) {
      expect(result.response).toBe(
        'I can help with strategy, but no email was generated.'
      )
    }
  })

  it('exposes a 4-minute default timeout that exceeds the global SDK default', () => {
    expect(GENERATE_EMAIL_DEFAULT_TIMEOUT_MS).toBe(240_000)
  })

  it('honours a caller-supplied AbortSignal', async () => {
    server.use(
      http.post('https://brew.new/api/v1/emails', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return HttpResponse.json({ response: 'too late' })
      })
    )

    const { client } = makeTestHttpClient()
    const generate = createGenerateEmail(client)

    const controller = new AbortController()
    const pending = generate(
      { prompt: 'Create a welcome email', emailType: 'campaign' },
      { signal: controller.signal }
    )
    controller.abort()

    await expect(pending).rejects.toThrowError()
  })

  it('threads emailType through the request body', async () => {
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/emails', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({
          emailId: 'email_auto',
          emailHtml: '<html>auto</html>',
        })
      })
    )

    const { client } = makeTestHttpClient()
    const generate = createGenerateEmail(client)
    await generate({
      prompt: 'day-2 nudge body for the welcome automation',
      emailType: 'automation',
    })

    expect(capturedBody).toMatchObject({
      emailType: 'automation',
    })
  })
})
