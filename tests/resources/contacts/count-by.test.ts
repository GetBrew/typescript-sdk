import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createCountContacts } from '../../../src/resources/contacts/count'
import { createCountContactsBy } from '../../../src/resources/contacts/count-by'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const GROUPED = {
  count: 1_200,
  groups: [
    { key: { plan: 'pro' }, count: 700 },
    { key: { plan: 'free' }, bucket: '2026-09-01T00:00:00.000Z', count: 500 },
  ],
  otherCount: 0,
}

function captureSearch(response: Record<string, unknown>): {
  body: () => unknown
} {
  let captured: unknown
  server.use(
    http.post(
      'https://brew.new/api/v1/contacts/search',
      async ({ request }) => {
        captured = await request.json()
        return HttpResponse.json(response)
      }
    )
  )
  return { body: () => captured }
}

describe('contacts.countBy', () => {
  it('POSTs count:true with groupBy/bucket and returns the grouped envelope', async () => {
    const capture = captureSearch(GROUPED)
    const { client } = makeTestHttpClient()
    const countBy = createCountContactsBy(client)

    const result = await countBy({
      groupBy: ['plan'],
      bucket: 'month',
      audienceId: 'aud_123',
    })

    expect(capture.body()).toEqual({
      groupBy: ['plan'],
      bucket: 'month',
      audienceId: 'aud_123',
      count: true,
    })
    expect(result).toEqual(GROUPED)
    expect(result.groups?.[1]?.bucket).toBe('2026-09-01T00:00:00.000Z')
  })

  it('returns the raw response with { raw: true }', async () => {
    captureSearch(GROUPED)
    const { client } = makeTestHttpClient()
    const countBy = createCountContactsBy(client)

    const raw = await countBy({ groupBy: ['emailDomain'] }, { raw: true })

    expect(raw.data).toEqual(GROUPED)
    expect(raw.status).toBe(200)
  })
})

describe('contacts.countBy types', () => {
  it('types groupBy as one or two fields, as the API requires', () => {
    const { client } = makeTestHttpClient()
    const countBy = createCountContactsBy(client)
    // Compile-time only: the calls are never made.
    const calls = [
      // @ts-expect-error -- the API refuses an empty groupBy
      () => countBy({ groupBy: [] }),
      // @ts-expect-error -- the API groups by at most two fields
      () => countBy({ groupBy: ['plan', 'country', 'emailDomain'] }),
      () => countBy({ groupBy: ['plan', 'country'] }),
    ]
    expect(calls).toHaveLength(3)
  })
})

describe('contacts.count', () => {
  it('scopes the count to a saved audience', async () => {
    const capture = captureSearch({ count: 3 })
    const { client } = makeTestHttpClient()
    const count = createCountContacts(client)

    const result = await count({ audienceId: 'aud_123' })

    expect(capture.body()).toEqual({ audienceId: 'aud_123', count: true })
    expect(result).toBe(3)
  })
})
