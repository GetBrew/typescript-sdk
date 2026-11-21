import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  IMPORT_IMAGE_DEFAULT_TIMEOUT_MS,
  createImportEmailImage,
} from '../../../src/resources/emails/image'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('emails.importImage', () => {
  it('posts the typed request and returns the requested representation', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/emails/image', async ({ request }) => {
        capturedRequest = request.clone()
        capturedBody = await request.json()
        return HttpResponse.json(
          {
            emailId: 'email_123',
            emailVersionId: 'version_123',
            title: 'Launch email',
            format: 'html',
            content: '<!doctype html><html><body>Launch</body></html>',
            conversion: 'layers',
            previewImage: 'https://cdn.brew.new/email_123.png',
            group: null,
          },
          { status: 201 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const importImage = createImportEmailImage(client)
    const result = await importImage({
      imageUrl: 'https://example.com/launch-email.png',
      title: 'Launch email',
      format: 'html',
    })

    expect(capturedRequest?.method).toBe('POST')
    expect(capturedRequest?.headers.get('idempotency-key')).toBeTruthy()
    expect(capturedBody).toEqual({
      imageUrl: 'https://example.com/launch-email.png',
      title: 'Launch email',
      format: 'html',
    })
    expect(result).toMatchObject({
      emailId: 'email_123',
      emailVersionId: 'version_123',
      format: 'html',
      conversion: 'layers',
      content: '<!doctype html><html><body>Launch</body></html>',
    })
  })

  it('matches the server timeout ceiling for a conversion that takes minutes', () => {
    expect(IMPORT_IMAGE_DEFAULT_TIMEOUT_MS).toBe(800_000)
  })
})
