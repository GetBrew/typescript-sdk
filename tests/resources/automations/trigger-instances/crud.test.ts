import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createTriggerInstancesResource } from '../../../../src/resources/automations/trigger-instances/resource'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

const INSTANCE_ROW = {
  triggerInstanceId: 'tin_01',
  source: 'api' as const,
  triggerEventId: 'tri_x',
  state: 'processed',
  matchedAutomationIds: ['auto_abc'],
  automationRunIds: ['run_a'],
  attempts: 1,
  receivedAt: '2026-04-08T12:34:56.789Z',
  processedAt: '2026-04-08T12:34:57.000Z',
}

describe('automations.triggerInstances — list/get wiring', () => {
  it('list GETs /v1/automations/trigger-instances with the triggerEventId filter and returns { data, pagination }', async () => {
    let url: string | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/automations/trigger-instances',
        ({ request }) => {
          url = request.url
          return HttpResponse.json({
            data: [INSTANCE_ROW],
            pagination: { limit: 100, cursor: null, hasMore: false },
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const triggerInstances = createTriggerInstancesResource(client)
    const result = await triggerInstances.list({ triggerEventId: 'tri_x' })

    expect(new URL(url!).pathname).toBe('/api/v1/automations/trigger-instances')
    expect(new URL(url!).searchParams.get('triggerEventId')).toBe('tri_x')
    expect(result.data[0]?.triggerInstanceId).toBe('tin_01')
    expect(result.data[0]?.automationRunIds).toEqual(['run_a'])
  })

  it('get GETs /v1/automations/trigger-instances/{id} and returns the BARE row', async () => {
    let url: string | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/automations/trigger-instances/tin_01',
        ({ request }) => {
          url = request.url
          return HttpResponse.json(INSTANCE_ROW)
        }
      )
    )

    const { client } = makeTestHttpClient()
    const triggerInstances = createTriggerInstancesResource(client)
    const instance = await triggerInstances.get('tin_01')

    expect(new URL(url!).pathname).toBe(
      '/api/v1/automations/trigger-instances/tin_01'
    )
    expect(instance.triggerInstanceId).toBe('tin_01')
    expect(instance.source).toBe('api')
  })

  it('surfaces an unknown instance as 404 TRIGGER_INSTANCE_NOT_FOUND, not an empty page', async () => {
    server.use(
      http.get(
        'https://brew.new/api/v1/automations/trigger-instances/tin_missing',
        () =>
          HttpResponse.json(
            {
              error: {
                code: 'TRIGGER_INSTANCE_NOT_FOUND',
                type: 'not_found',
                message: 'Trigger instance tin_missing was not found.',
                suggestion:
                  'List recent fires with GET /v1/automations/trigger-instances.',
                docs: 'https://docs.brew.new/api-reference/api/errors',
              },
            },
            { status: 404 }
          )
      )
    )

    const { client } = makeTestHttpClient()
    const triggerInstances = createTriggerInstancesResource(client)

    await expect(triggerInstances.get('tin_missing')).rejects.toMatchObject({
      status: 404,
      code: 'TRIGGER_INSTANCE_NOT_FOUND',
    })
  })

  it('listAll walks every page following pagination.cursor', async () => {
    const seenCursors: Array<string | null> = []
    server.use(
      http.get(
        'https://brew.new/api/v1/automations/trigger-instances',
        ({ request }) => {
          const cursor = new URL(request.url).searchParams.get('cursor')
          seenCursors.push(cursor)
          if (cursor === null) {
            return HttpResponse.json({
              data: [INSTANCE_ROW],
              pagination: { limit: 1, cursor: 'page2', hasMore: true },
            })
          }
          return HttpResponse.json({
            data: [{ ...INSTANCE_ROW, triggerInstanceId: 'tin_02' }],
            pagination: { limit: 1, cursor: null, hasMore: false },
          })
        }
      )
    )

    const { client } = makeTestHttpClient()
    const triggerInstances = createTriggerInstancesResource(client)

    const ids: Array<string> = []
    for await (const row of triggerInstances.listAll({ limit: 1 })) {
      ids.push(row.triggerInstanceId)
    }

    expect(ids).toEqual(['tin_01', 'tin_02'])
    expect(seenCursors).toEqual([null, 'page2'])
  })
})
