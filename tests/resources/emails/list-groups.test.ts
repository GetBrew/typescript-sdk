import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createListEmailGroups } from '../../../src/resources/emails/list-groups'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('emails.listGroups', () => {
  it('sends GET /v1/email-groups with pagination and returns Ungrouped', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/email-groups', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          data: [
            { groupId: 'grp_lifecycle', groupName: 'Lifecycle' },
            { groupId: 'ungrouped', groupName: 'Ungrouped' },
          ],
          pagination: { limit: 2, cursor: 'next', hasMore: true },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const listGroups = createListEmailGroups(client)
    const result = await listGroups({ limit: 2, cursor: 'cursor_1' })

    const url = new URL(capturedRequest!.url)
    expect(url.pathname).toBe('/api/v1/email-groups')
    expect(url.searchParams.get('limit')).toBe('2')
    expect(url.searchParams.get('cursor')).toBe('cursor_1')
    expect(result.data.at(-1)).toEqual({
      groupId: 'ungrouped',
      groupName: 'Ungrouped',
    })
  })
})
