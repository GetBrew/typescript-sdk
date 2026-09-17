import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetEmailGroup } from '../../../src/resources/email-groups/get'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('emailGroups.get', () => {
  it('GETs /v1/email-groups/{groupId} and returns the BARE row', async () => {
    let url: string | undefined
    server.use(
      http.get('https://brew.new/api/v1/email-groups/grp_1', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          groupId: 'grp_1',
          groupName: 'Launches',
          emailCount: 7,
        })
      })
    )

    const { client } = makeTestHttpClient()
    const group = await createGetEmailGroup(client)('grp_1')

    expect(new URL(url!).pathname).toBe('/api/v1/email-groups/grp_1')
    expect(group.groupName).toBe('Launches')
    expect(group.emailCount).toBe(7)
  })

  it('surfaces an unknown id as 404 EMAIL_GROUP_NOT_FOUND', async () => {
    server.use(
      http.get('https://brew.new/api/v1/email-groups/:groupId', () =>
        HttpResponse.json(
          {
            error: {
              code: 'EMAIL_GROUP_NOT_FOUND',
              type: 'not_found',
              message: 'Email group grp_missing was not found.',
              suggestion: 'List folders with GET /v1/email-groups.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 404 }
        )
      )
    )

    const { client } = makeTestHttpClient()

    await expect(
      createGetEmailGroup(client)('grp_missing')
    ).rejects.toMatchObject({ status: 404, code: 'EMAIL_GROUP_NOT_FOUND' })
  })
})
