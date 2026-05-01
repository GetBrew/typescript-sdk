import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListAllContacts } from '../../../src/resources/contacts/list-all'
import type { Contact } from '../../../src/resources/contacts/types'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const PAGE_1_CONTACTS: Array<Contact> = [
  {
    email: 'jane@example.com',
    subscribed: true,
    suppressed: false,
    createdAt: 1,
    updatedAt: 1,
    customFields: {},
  },
  {
    email: 'john@example.com',
    subscribed: true,
    suppressed: false,
    createdAt: 2,
    updatedAt: 2,
    customFields: {},
  },
]

const PAGE_2_CONTACTS: Array<Contact> = [
  {
    email: 'kim@example.com',
    subscribed: true,
    suppressed: false,
    createdAt: 3,
    updatedAt: 3,
    customFields: {},
  },
]

describe('contacts.listAll', () => {
  it('walks every page and yields every contact in order', async () => {
    let pageRequests = 0
    const requestedCursors: Array<string | null> = []
    server.use(
      http.get('https://brew.new/api/v1/contacts', ({ request }) => {
        pageRequests++
        const url = new URL(request.url)
        const cursor = url.searchParams.get('cursor')
        requestedCursors.push(cursor)
        if (cursor === null) {
          return HttpResponse.json({
            contacts: PAGE_1_CONTACTS,
            pagination: {
              limit: 50,
              cursor: 'CURSOR_PAGE_2',
              hasMore: true,
            },
          })
        }
        return HttpResponse.json({
          contacts: PAGE_2_CONTACTS,
          pagination: {
            limit: 50,
            cursor: null,
            hasMore: false,
          },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const listAll = createListAllContacts(client)

    const collected: Array<Contact> = []
    for await (const contact of listAll()) {
      collected.push(contact)
    }

    expect(pageRequests).toBe(2)
    expect(requestedCursors).toEqual([null, 'CURSOR_PAGE_2'])
    expect(collected.map((c) => c.email)).toEqual([
      'jane@example.com',
      'john@example.com',
      'kim@example.com',
    ])
  })

  it('stops paging once the caller AbortSignal aborts between pages', async () => {
    const controller = new AbortController()
    let pageRequests = 0
    server.use(
      http.get('https://brew.new/api/v1/contacts', () => {
        pageRequests++
        return HttpResponse.json({
          contacts: PAGE_1_CONTACTS,
          pagination: {
            limit: 50,
            cursor: 'CURSOR_NEXT',
            hasMore: true,
          },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const listAll = createListAllContacts(client)

    const collected: Array<Contact> = []
    for await (const contact of listAll({}, { signal: controller.signal })) {
      collected.push(contact)
      if (collected.length === PAGE_1_CONTACTS.length) {
        controller.abort()
      }
    }

    expect(collected).toHaveLength(PAGE_1_CONTACTS.length)
    expect(pageRequests).toBe(1)
  })
})
