import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetFlow } from '../../../src/resources/flows/get'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const FLOW = {
  slug: 'notion.com',
  brand: { name: 'Notion' },
  title: 'Notion onboarding flow',
  type: 'signup',
  category: 'welcome',
  categoryLabel: 'Welcome',
  emailCount: 2,
  spanDays: 2.1,
  remixCount: 4,
  previewImages: ['https://cdn.brew.new/p1.png'],
  publishedAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-02T12:00:00.000Z',
  anchor: 'signedUpAt',
  steps: [
    {
      order: 1,
      dayOffset: 0,
      delayDays: 0,
      subject: 'Welcome to Notion',
      category: 'welcome',
      categoryLabel: 'Welcome',
      emailId: 'pt1_aaa',
    },
    {
      order: 2,
      dayOffset: 2.1,
      delayDays: 2.1,
      subject: 'Three templates to try',
      category: 'education',
      categoryLabel: 'Education',
      emailId: 'pt1_bbb',
      html: '<html>two</html>',
    },
  ],
}

describe('flows.get', () => {
  it('GETs /v1/flows/{slug} and returns the BARE flow with anchor and steps', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/flows/notion.com', ({ request }) => {
        url = request.url
        return HttpResponse.json(FLOW)
      })
    )

    const { client } = makeTestHttpClient()
    const flow = await createGetFlow(client)('notion.com')

    expect(new URL(url!).pathname).toBe('/api/v1/flows/notion.com')
    expect(new URL(url!).search).toBe('')
    expect(flow).not.toHaveProperty('data')
    expect(flow.slug).toBe('notion.com')
    expect(flow.anchor).toBe('signedUpAt')
    expect(flow.steps?.map((step) => step.emailId)).toEqual([
      'pt1_aaa',
      'pt1_bbb',
    ])
  })

  it('serializes an include array as a single comma string', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/flows/notion.com', ({ request }) => {
        url = request.url
        return HttpResponse.json(FLOW)
      })
    )

    const { client } = makeTestHttpClient()
    const flow = await createGetFlow(client)('notion.com', {
      include: ['html'],
    })

    expect(new URL(url!).searchParams.get('include')).toBe('html')
    expect(flow.steps?.[1]?.html).toBe('<html>two</html>')
  })

  it('accepts include as a comma string too, and URL-encodes the slug', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/flows/:slug', ({ request }) => {
        url = request.url
        return HttpResponse.json(FLOW)
      })
    )

    const { client } = makeTestHttpClient()
    await createGetFlow(client)('Notion.COM', { include: 'html' })

    expect(new URL(url!).pathname).toBe('/api/v1/flows/Notion.COM')
    expect(new URL(url!).searchParams.get('include')).toBe('html')
  })
})
