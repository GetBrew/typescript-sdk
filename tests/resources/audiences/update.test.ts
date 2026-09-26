import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createUpdateAudience } from '../../../src/resources/audiences/update'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const NOW = '2026-09-25T12:00:00.000Z'
const ROW = {
  audienceId: 'aud_123',
  audienceName: 'Launch list',
  filters: {
    filters: [
      {
        field: 'email',
        operator: 'in',
        value: ['ada@example.com', 'grace@example.com'],
      },
    ],
    logicalOperator: 'and',
  },
  count: 2,
  createdAt: NOW,
  updatedAt: NOW,
}
const MEMBERSHIP = {
  added: ['grace@example.com'],
  alreadyPresent: ['ada@example.com'],
  unExcluded: [],
  removedFromList: [],
  excludedByFilter: [],
  notAMember: [],
  noContactYet: [],
}

describe('audiences.update', () => {
  it('PATCHes addEmails/removeEmails and returns the membership report', async () => {
    let capturedRequest: Request | undefined
    let capturedBody: unknown
    server.use(
      http.patch(
        'https://brew.new/api/v1/audiences/aud_123',
        async ({ request }) => {
          capturedRequest = request.clone()
          capturedBody = await request.json()
          return HttpResponse.json({ ...ROW, membership: MEMBERSHIP })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const update = createUpdateAudience(client)

    const result = await update({
      audienceId: 'aud_123',
      addEmails: ['ada@example.com', 'grace@example.com'],
      expectedUpdatedAt: NOW,
    })

    expect(capturedRequest?.method).toBe('PATCH')
    expect(capturedBody).toEqual({
      addEmails: ['ada@example.com', 'grace@example.com'],
      expectedUpdatedAt: NOW,
    })
    expect(result.membership?.added).toEqual(['grace@example.com'])
    expect(result.audienceId).toBe('aud_123')
  })

  it('types the stamped email-list report a long `email in` list returns', async () => {
    const materializations = [
      {
        fieldName: 'list_launch',
        providedEmails: 1_200,
        matchedContacts: 1_180,
      },
    ]
    server.use(
      http.patch('https://brew.new/api/v1/audiences/aud_123', () =>
        HttpResponse.json({
          ...ROW,
          emailListMaterializations: materializations,
        })
      )
    )
    const { client } = makeTestHttpClient()
    const update = createUpdateAudience(client)

    const result = await update({ audienceId: 'aud_123', name: 'Launch list' })

    expect(result.emailListMaterializations).toEqual(materializations)
  })
})
