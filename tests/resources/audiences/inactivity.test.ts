import { http, HttpResponse } from 'msw'
import { expect, it } from 'vitest'
import type { CreateAudienceInput } from '../../../src/resources/audiences/create'
import { createAudiencesResource } from '../../../src/resources/audiences/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

it('accepts the generated relative inactivity filter type without changing its wire operand', async () => {
  let body: unknown
  server.use(
    http.post('https://brew.new/api/v1/audiences', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ audienceId: 'aud_dormant' }, { status: 201 })
    })
  )
  const input: CreateAudienceInput = {
    name: 'Dormant',
    filters: {
      filters: [
        {
          field: 'posthog.last_used_at',
          operator: 'inactive_for_days',
          type: 'date',
          value: 30,
        },
      ],
      logicalOperator: 'and',
    },
  }
  const { client } = makeTestHttpClient()
  await createAudiencesResource(client).create(input)
  expect(body).toEqual(input)
})
