import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createCreateEmailGroup } from '../../../src/resources/email-groups/create'
import { createUpdateEmailGroup } from '../../../src/resources/email-groups/update'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

/**
 * Group writes move designs in (GetBrew/brew-v2#1814): `emailIds` (up to 50)
 * on create and update, answered with what moved — `moved` and `notMoved`
 * with a reason per design.
 */
describe('emailGroups writes', () => {
  it('creates a folder and moves designs into it in one call', async () => {
    let body: unknown
    server.use(
      http.post('https://brew.new/api/v1/email-groups', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(
          {
            groupId: 'grp_new',
            groupName: 'Launches',
            emailCount: 1,
            moved: 1,
            notMoved: [{ emailId: 'eml_busy', reason: 'generating' }],
          },
          { status: 201 }
        )
      })
    )

    const { client } = makeTestHttpClient()
    const group = await createCreateEmailGroup(client)({
      name: 'Launches',
      emailIds: ['eml_1', 'eml_busy'],
    })

    expect(body).toEqual({ name: 'Launches', emailIds: ['eml_1', 'eml_busy'] })
    const moved: number | undefined = group.moved
    expect(moved).toBe(1)
    expect(group.notMoved).toEqual([
      { emailId: 'eml_busy', reason: 'generating' },
    ])
  })

  it('moves designs into an existing folder without renaming it', async () => {
    let body: unknown
    let path: string | undefined
    server.use(
      http.patch(
        'https://brew.new/api/v1/email-groups/grp_1',
        async ({ request }) => {
          body = await request.json()
          path = new URL(request.url).pathname
          return HttpResponse.json({
            groupId: 'grp_1',
            groupName: 'Launches',
            emailCount: 9,
            moved: 2,
            notMoved: [],
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const group = await createUpdateEmailGroup(client)({
      groupId: 'grp_1',
      emailIds: ['eml_1', 'eml_2'],
    })

    expect(path).toBe('/api/v1/email-groups/grp_1')
    // `name` is optional now: a move alone sends only the ids.
    expect(body).toEqual({ emailIds: ['eml_1', 'eml_2'] })
    expect(group.moved).toBe(2)
    expect(group.notMoved).toEqual([])
  })
})
