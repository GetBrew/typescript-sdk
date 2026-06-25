import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createImportEmail } from '../../../src/resources/emails/import'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('emails.import', () => {
  it('POSTs /v1/emails/import and returns the generated artifact (201)', async () => {
    let captured: Request | undefined
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/emails/import',
        async ({ request }) => {
          captured = request.clone()
          body = await request.json()
          return HttpResponse.json(
            {
              emailId: 'eml_imported',
              emailVersionId: 'emv_imported_v1',
              html: '<!DOCTYPE html><html><body>Welcome to Brew.</body></html>',
              previewImage: 'https://cdn.brew.new/p/eml_imported.png',
            },
            { status: 201 }
          )
        }
      )
    )

    const { client } = makeTestHttpClient()
    const importEmail = createImportEmail(client)

    const result = await importEmail({
      format: 'html',
      content: '<html><body>Welcome to Brew.</body></html>',
      title: 'Imported welcome',
    })

    expect(new URL(captured!.url).pathname).toBe('/api/v1/emails/import')
    expect(captured?.method).toBe('POST')
    expect(body).toEqual({
      format: 'html',
      content: '<html><body>Welcome to Brew.</body></html>',
      title: 'Imported welcome',
    })
    // POST auto-attaches an idempotency key so the import is retry-safe.
    expect(captured?.headers.get('idempotency-key')).toBeTruthy()
    expect(result.emailId).toBe('eml_imported')
    expect(result.emailVersionId).toBe('emv_imported_v1')
    expect(result.html).toContain('Welcome to Brew')
  })

  it('forwards mjml + jsx formats', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/emails/import',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(
            {
              emailId: 'eml_imported',
              emailVersionId: 'emv_imported_v1',
              html: '<!DOCTYPE html><html><body>x</body></html>',
            },
            { status: 201 }
          )
        }
      )
    )
    const { client } = makeTestHttpClient()
    const importEmail = createImportEmail(client)

    await importEmail({
      format: 'mjml',
      content:
        '<mjml><mj-body><mj-section><mj-column><mj-text>Hi</mj-text></mj-column></mj-section></mj-body></mjml>',
    })
    expect((body as { format?: string })?.format).toBe('mjml')

    await importEmail({
      format: 'jsx',
      content: '<Html><Body><Text>x</Text></Body></Html>',
    })
    expect((body as { format?: string })?.format).toBe('jsx')
  })

  it('honors a caller-supplied idempotency key', async () => {
    let captured: Request | undefined
    server.use(
      http.post('https://brew.new/api/v1/emails/import', ({ request }) => {
        captured = request.clone()
        return HttpResponse.json(
          {
            emailId: 'eml_imported',
            emailVersionId: 'emv_imported_v1',
            html: '<html></html>',
          },
          { status: 201 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const importEmail = createImportEmail(client)

    await importEmail(
      { format: 'jsx', content: '<Html />' },
      { idempotencyKey: 'import-001' }
    )

    expect(captured?.headers.get('idempotency-key')).toBe('import-001')
  })
})
