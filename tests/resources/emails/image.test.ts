import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  IMPORT_IMAGE_DEFAULT_TIMEOUT_MS,
  type ImportEmailImageResponse,
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

  it('preserves typed fallback warnings in normal and raw responses', async () => {
    const fallback: ImportEmailImageResponse = {
      emailId: 'email_fallback',
      emailVersionId: 'version_fallback',
      title: 'Layout only',
      format: 'jsx',
      content: '<Html><Body><Img width={300} /></Body></Html>',
      conversion: 'model',
      fallbackReason: 'layer_service_unavailable',
      warnings: [
        {
          code: 'IMAGE_LAYER_FALLBACK',
          message: 'Layer service unavailable.',
          field: 'imageUrl',
        },
        {
          code: 'IMAGE_ASSETS_NOT_RECOVERED',
          message: 'Add the original pictures.',
          field: 'content',
        },
      ],
      group: null,
    }
    server.use(
      http.post('https://brew.new/api/v1/emails/image', () =>
        HttpResponse.json(fallback, { status: 201 })
      )
    )
    const { client } = makeTestHttpClient()
    const importImage = createImportEmailImage(client)
    const input = { imageUrl: 'https://example.com/screenshot.png' }
    const [normal, raw] = await Promise.all([
      importImage(input),
      importImage(input, { raw: true }),
    ])
    expect(normal).toEqual(fallback)
    expect(raw.data).toEqual(fallback)
    expect(raw.status).toBe(201)
  })

  it('matches the server timeout ceiling for a conversion that takes minutes', () => {
    expect(IMPORT_IMAGE_DEFAULT_TIMEOUT_MS).toBe(800_000)
  })
})
