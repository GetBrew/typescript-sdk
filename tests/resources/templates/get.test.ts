import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetTemplate } from '../../../src/resources/templates/get'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const TEMPLATE = {
  emailId: 'pt1_vercel_digest',
  templateId: 'pt1_vercel_digest',
  title: 'Vercel Frontend Digest',
  previewImage: 'https://cdn.brew.new/pt1_vercel_digest.png',
  updatedAt: '2026-09-01T12:00:00.000Z',
  referenceEmailId: 'pt1_vercel_digest',
  viewUrl: 'https://brew.new/templates/pt1_vercel_digest',
}

describe('templates.get', () => {
  it('GETs /v1/templates/{templateId} with no query by default', async () => {
    let url: string | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/templates/pt1_vercel_digest',
        ({ request }) => {
          url = request.url
          return HttpResponse.json(TEMPLATE)
        }
      )
    )

    const { client } = makeTestHttpClient()
    const template = await createGetTemplate(client)('pt1_vercel_digest')

    expect(new URL(url!).pathname).toBe('/api/v1/templates/pt1_vercel_digest')
    expect(new URL(url!).search).toBe('')
    expect(template.referenceEmailId).toBe('pt1_vercel_digest')
  })

  it('forwards include=html', async () => {
    let url: string | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/templates/pt1_vercel_digest',
        ({ request }) => {
          url = request.url
          return HttpResponse.json({
            ...TEMPLATE,
            html: '<html><body>Digest</body></html>',
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const template = await createGetTemplate(client)('pt1_vercel_digest', {
      include: 'html',
    })

    expect(new URL(url!).searchParams.get('include')).toBe('html')
    expect(template.html).toContain('Digest')
  })
})
