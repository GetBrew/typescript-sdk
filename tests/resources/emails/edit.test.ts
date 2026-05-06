import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  EDIT_EMAIL_DEFAULT_TIMEOUT_MS,
  createEditEmail,
} from '../../../src/resources/emails/edit'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('emails.edit', () => {
  it('sends PATCH /v1/emails/{emailId} with the edit body and returns the email artifact response', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.patch(
        'https://brew.new/api/v1/emails/email_existing',
        async ({ request }) => {
          capturedRequest = request.clone()
          capturedBody = await request.json()
          return HttpResponse.json({
            emailId: 'email_existing',
            emailHtml: '<html><body>Edited</body></html>',
            emailPng: 'https://cdn.brew.new/email_existing.png',
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const edit = createEditEmail(client)

    const result = await edit({
      emailId: 'email_existing',
      prompt: 'Tighten the headline.',
      contentUrl: 'https://vercel.com/blog/post',
    })

    expect(capturedRequest?.method).toBe('PATCH')
    expect(capturedRequest?.url).toBe(
      'https://brew.new/api/v1/emails/email_existing'
    )
    // emailId must NOT be in the body — it lives on the URL.
    expect(capturedBody).toEqual({
      prompt: 'Tighten the headline.',
      contentUrl: 'https://vercel.com/blog/post',
    })
    expect('emailId' in result).toBe(true)
    if ('emailId' in result) {
      expect(result.emailId).toBe('email_existing')
      expect(result.emailHtml).toContain('Edited')
    }
  })

  it('encodes the emailId path segment so unusual ids are safe on the wire', async () => {
    let captured: string | undefined
    server.use(
      http.patch(
        'https://brew.new/api/v1/emails/:emailId',
        ({ params }) => {
          captured = String(params.emailId)
          return HttpResponse.json({
            emailId: 'odd id',
            emailHtml: '<html />',
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const edit = createEditEmail(client)
    await edit({ emailId: 'odd id', prompt: 'Edit' })
    // MSW decodes the captured param, so the captured value should
    // round-trip back to the original even though the path encodes
    // the space as %20.
    expect(captured).toBe('odd id')
  })

  it('forwards a caller-supplied Idempotency-Key', async () => {
    let captured: Request | undefined
    server.use(
      http.patch('https://brew.new/api/v1/emails/abc', ({ request }) => {
        captured = request.clone()
        return HttpResponse.json({ emailId: 'abc', emailHtml: '<x />' })
      })
    )
    const { client } = makeTestHttpClient()
    const edit = createEditEmail(client)
    await edit(
      { emailId: 'abc', prompt: 'Edit' },
      { idempotencyKey: 'edit-key-001' }
    )
    expect(captured?.headers.get('idempotency-key')).toBe('edit-key-001')
  })

  it('returns the text response shape when no artifact is produced', async () => {
    server.use(
      http.patch('https://brew.new/api/v1/emails/abc', () => {
        return HttpResponse.json({
          response: 'I can suggest copy ideas, but no email was generated.',
        })
      })
    )
    const { client } = makeTestHttpClient()
    const edit = createEditEmail(client)
    const result = await edit({ emailId: 'abc', prompt: 'Suggestions only' })

    expect('emailId' in result).toBe(false)
    if (!('emailId' in result)) {
      expect(result.response).toContain('suggest copy ideas')
    }
  })

  it('exposes a 4-minute default timeout that exceeds the global SDK default', () => {
    expect(EDIT_EMAIL_DEFAULT_TIMEOUT_MS).toBe(240_000)
  })

  it('honours a caller-supplied AbortSignal', async () => {
    server.use(
      http.patch('https://brew.new/api/v1/emails/abc', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return HttpResponse.json({ response: 'too late' })
      })
    )
    const { client } = makeTestHttpClient()
    const edit = createEditEmail(client)
    const controller = new AbortController()
    const pending = edit(
      { emailId: 'abc', prompt: 'Edit' },
      { signal: controller.signal }
    )
    controller.abort()
    await expect(pending).rejects.toThrowError()
  })
})
