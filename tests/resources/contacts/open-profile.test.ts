import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  Contact,
  ContactOpenProfile,
  ContactSearchRow,
  ContactsIncludeToken,
  CountContactsInput,
  GetContactOptions,
  GetContactResponse,
  SearchContactsInput,
  SearchContactsResponse,
} from '../../../src/index'
import { createContactsResource } from '../../../src/resources/contacts/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const OPEN_PROFILE = {
  totalOpens: 14,
  lastOpenedAt: '2026-09-30T08:31:00.000Z',
  bestOpenMinuteUtc: 510,
  bestSendMinuteUtc: 480,
  confidence: 0.72,
  histogram: Array.from({ length: 48 }, (_, slot) => (slot === 17 ? 9 : 0)),
}

const CONTACT = {
  email: 'jane+brew@example.com',
  firstName: 'Jane',
  subscribed: true,
  createdAt: '2026-04-08T12:00:00.000Z',
  updatedAt: '2026-04-08T12:00:00.000Z',
}

const INSUFFICIENT_PERMISSIONS = {
  error: {
    code: 'INSUFFICIENT_PERMISSIONS',
    type: 'authorization_error',
    message: 'include=openProfile needs the emails scope.',
    param: 'include',
    suggestion: 'Use a key with the emails scope as well as contacts.',
    docs: 'https://docs.brew.new/api-reference/api/errors',
  },
}

describe('contacts.get — include openProfile', () => {
  it('sends no query without include', async () => {
    let url: URL | undefined
    server.use(
      http.get('https://brew.new/api/v1/contacts/:email', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(CONTACT)
      })
    )

    const { client } = makeTestHttpClient()
    const contact = await createContactsResource(client).get(CONTACT.email)

    expect(url?.search).toBe('')
    expect(contact.openProfile).toBeUndefined()
  })

  it('sends include=openProfile (token, array or comma string) and returns the profile', async () => {
    const includes: Array<string | null> = []
    server.use(
      http.get('https://brew.new/api/v1/contacts/:email', ({ request }) => {
        includes.push(new URL(request.url).searchParams.get('include'))
        return HttpResponse.json({ ...CONTACT, openProfile: OPEN_PROFILE })
      })
    )

    const { client } = makeTestHttpClient()
    const contacts = createContactsResource(client)
    const contact = await contacts.get(CONTACT.email, {
      include: ['openProfile'],
    })
    await contacts.get(CONTACT.email, { include: 'openProfile' })

    expect(includes).toEqual(['openProfile', 'openProfile'])
    expect(contact.openProfile?.totalOpens).toBe(14)
    expect(contact.openProfile?.histogram).toHaveLength(48)
    expect(contact.openProfile?.bestSendMinuteUtc).toBe(480)
  })

  it('round-trips a contact with no folded opens as openProfile: null', async () => {
    server.use(
      http.get('https://brew.new/api/v1/contacts/:email', () =>
        HttpResponse.json({ ...CONTACT, openProfile: null })
      )
    )

    const { client } = makeTestHttpClient()
    const contact = await createContactsResource(client).get(CONTACT.email, {
      include: ['openProfile'],
    })

    expect(contact.openProfile).toBeNull()
  })

  it('keeps raw mode with include', async () => {
    server.use(
      http.get('https://brew.new/api/v1/contacts/:email', () =>
        HttpResponse.json(
          { ...CONTACT, openProfile: OPEN_PROFILE },
          { headers: { 'x-request-id': 'req_profile' } }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const raw = await createContactsResource(client).get(CONTACT.email, {
      include: ['openProfile'],
      raw: true,
    })

    expect(raw.requestId).toBe('req_profile')
    expect(raw.data.openProfile?.confidence).toBe(0.72)
  })

  it('surfaces a key without the emails scope as 403 INSUFFICIENT_PERMISSIONS', async () => {
    server.use(
      http.get('https://brew.new/api/v1/contacts/:email', () =>
        HttpResponse.json(INSUFFICIENT_PERMISSIONS, { status: 403 })
      )
    )

    const { client } = makeTestHttpClient()

    await expect(
      createContactsResource(client).get(CONTACT.email, {
        include: ['openProfile'],
      })
    ).rejects.toMatchObject({
      status: 403,
      code: 'INSUFFICIENT_PERMISSIONS',
      type: 'authorization_error',
    })
  })
})

describe('contacts.search — include openProfile', () => {
  it('sends include in the body next to count:false and returns profiles per row', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/contacts/search',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({
            data: [
              { ...CONTACT, openProfile: OPEN_PROFILE },
              { ...CONTACT, email: 'bo@example.com', openProfile: null },
            ],
            // A page with openProfile holds at most 10 contacts, and
            // pagination.limit reports the size read.
            pagination: { limit: 10, cursor: 'c2', hasMore: true },
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const page = await createContactsResource(client).search({
      limit: 50,
      include: ['openProfile'],
    })

    expect(body).toEqual({
      limit: 50,
      include: ['openProfile'],
      count: false,
    })
    expect(page.data[0]?.openProfile?.totalOpens).toBe(14)
    expect(page.data[1]?.openProfile).toBeNull()
    expect(page.pagination.limit).toBe(10)
  })

  it('leaves an empty include out of the body (the API needs at least one token)', async () => {
    let body: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/contacts/search',
        async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({
            data: [CONTACT],
            pagination: { limit: 50, cursor: null, hasMore: false },
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    await createContactsResource(client).search({ search: 'jane', include: [] })

    expect(body).toEqual({ search: 'jane', count: false })
  })

  it('surfaces a key without the emails scope as 403 INSUFFICIENT_PERMISSIONS', async () => {
    server.use(
      http.post('https://brew.new/api/v1/contacts/search', () =>
        HttpResponse.json(INSUFFICIENT_PERMISSIONS, { status: 403 })
      )
    )

    const { client } = makeTestHttpClient()

    await expect(
      createContactsResource(client).search({ include: ['openProfile'] })
    ).rejects.toMatchObject({ status: 403, code: 'INSUFFICIENT_PERMISSIONS' })
  })

  it('searchAll carries include on every page', async () => {
    const bodies: Array<Record<string, unknown>> = []
    server.use(
      http.post(
        'https://brew.new/api/v1/contacts/search',
        async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>
          bodies.push(body)
          if (body['cursor'] === undefined) {
            return HttpResponse.json({
              data: [{ ...CONTACT, openProfile: OPEN_PROFILE }],
              pagination: { limit: 10, cursor: 'c2', hasMore: true },
            })
          }
          return HttpResponse.json({
            data: [{ ...CONTACT, email: 'bo@example.com', openProfile: null }],
            pagination: { limit: 10, cursor: null, hasMore: false },
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const seen: Array<[string, number | null | undefined]> = []
    for await (const contact of createContactsResource(client).searchAll({
      include: ['openProfile'],
    })) {
      seen.push([contact.email, contact.openProfile?.totalOpens ?? null])
    }

    expect(seen).toEqual([
      ['jane+brew@example.com', 14],
      ['bo@example.com', null],
    ])
    expect(bodies).toEqual([
      { include: ['openProfile'], count: false },
      { include: ['openProfile'], cursor: 'c2', count: false },
    ])
  })

  it('types include on get and search, and keeps it off the count modes', () => {
    expectTypeOf<ContactsIncludeToken>().toEqualTypeOf<'openProfile'>()
    expectTypeOf<{ include: ['openProfile'] }>().toExtend<GetContactOptions>()
    expectTypeOf<{ include: ['coverage'] }>().not.toExtend<GetContactOptions>()
    expectTypeOf<{
      include: ['openProfile']
    }>().toExtend<SearchContactsInput>()
    expectTypeOf<{ include: ['other'] }>().not.toExtend<SearchContactsInput>()
    // The API refuses include with count: true, so the count input has no include.
    expectTypeOf<CountContactsInput>().not.toHaveProperty('include')
    expectTypeOf<ContactOpenProfile['histogram']>().toEqualTypeOf<
      Array<number>
    >()
  })

  it('carries openProfile on the get and search reads only, never on the shared Contact', () => {
    expectTypeOf<Contact>().not.toHaveProperty('openProfile')
    expectTypeOf<GetContactResponse['openProfile']>().toEqualTypeOf<
      ContactOpenProfile | null | undefined
    >()
    // The page arm with profiles types every row, with or without include.
    expectTypeOf<
      SearchContactsResponse['data'][number]
    >().toEqualTypeOf<ContactSearchRow>()
    expectTypeOf<ContactSearchRow['openProfile']>().toEqualTypeOf<
      ContactOpenProfile | null | undefined
    >()
    expectTypeOf<SearchContactsResponse>().not.toHaveProperty('count')
  })
})
