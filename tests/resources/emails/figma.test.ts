import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  IMPORT_FIGMA_DEFAULT_TIMEOUT_MS,
  createImportFigmaDesign,
} from '../../../src/resources/emails/figma'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('emails.importFigma', () => {
  it('posts the typed source request and returns the requested representation', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.post('https://brew.new/api/v1/emails/figma', async ({ request }) => {
        capturedRequest = request.clone()
        capturedBody = await request.json()
        return HttpResponse.json(
          {
            emailId: 'email_123',
            emailVersionId: 'version_123',
            title: 'Launch email',
            format: 'html',
            content: '<!doctype html><html><body>Launch</body></html>',
            warningCount: 1,
            exportedNodeCount: 2,
            previewImage: 'https://cdn.brew.new/email_123.png',
          },
          { status: 201 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const importFigma = createImportFigmaDesign(client)
    const result = await importFigma({
      figmaUrl: 'https://www.figma.com/design/abc123/Launch-email?node-id=1-2',
      title: 'Launch email',
      format: 'html',
    })

    expect(capturedRequest?.method).toBe('POST')
    expect(capturedRequest?.headers.get('idempotency-key')).toBeTruthy()
    expect(capturedBody).toEqual({
      figmaUrl: 'https://www.figma.com/design/abc123/Launch-email?node-id=1-2',
      title: 'Launch email',
      format: 'html',
    })
    expect(result).toMatchObject({
      emailId: 'email_123',
      emailVersionId: 'version_123',
      format: 'html',
      content: '<!doctype html><html><body>Launch</body></html>',
    })
  })

  it('matches the server timeout ceiling for large deterministic imports', () => {
    expect(IMPORT_FIGMA_DEFAULT_TIMEOUT_MS).toBe(800_000)
  })
})
