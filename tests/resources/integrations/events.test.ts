import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  IntegrationEvent,
  IntegrationEventDetail,
  IntegrationEventKind,
  ListIntegrationEventsInput,
} from '../../../src/index'
import { BrewApiError } from '../../../src/core/errors'
import { createIntegrationsResource } from '../../../src/resources/integrations/resource'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const EVENTS_URL = 'https://brew.new/api/v1/integrations/events'

const EVENT = {
  eventId: 'k5714pq3vm8x2n6c9d0b7f1h4j6g2r8t',
  provider: 'posthog',
  sourceId: 'cgr_4f2a9c',
  eventKey: 'created_project',
  title: 'created_project',
  label: 'Created a project',
  kind: 'custom',
  stage: 'activation',
  modelRoles: ['activation', 'key_event'],
  volume30d: 8100,
  lastSeenAt: '2026-10-26T09:12:00.000Z',
}

const SOURCE = {
  sourceId: 'cgr_4f2a9c',
  provider: 'posthog',
  mode: 'tenant_catalog',
  definitionCount: 214,
  isTruncated: false,
  lastSyncedAt: '2026-10-26T06:00:00.000Z',
}

const DETAIL = {
  ...EVENT,
  description: 'A person created a project.',
  properties: [
    {
      key: 'project_name',
      variable: 'properties.project_name',
      scope: 'event',
      type: 'string',
      description: 'The name of the new project',
      isPersonal: false,
      isPersonalization: true,
    },
    {
      key: 'first_name',
      variable: 'person.first_name',
      scope: 'person',
      type: 'string',
      isPersonal: true,
      isPersonalization: false,
    },
  ],
}

describe('integrations.events.list', () => {
  it('GETs /v1/integrations/events with no query by default and returns { data, sources, pagination }', async () => {
    let url: URL | undefined
    server.use(
      http.get(EVENTS_URL, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({
          data: [EVENT],
          sources: [SOURCE],
          pagination: { limit: 100, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    const page = await createIntegrationsResource(client).events.list()

    expect(url?.pathname).toBe('/api/v1/integrations/events')
    expect(url?.search).toBe('')
    expect(page.data[0]?.eventId).toBe(EVENT.eventId)
    expect(page.data[0]?.modelRoles).toEqual(['activation', 'key_event'])
    expect(page.sources[0]?.mode).toBe('tenant_catalog')
    expect(page.pagination.hasMore).toBe(false)
    expectTypeOf(page.data[0]!).toEqualTypeOf<IntegrationEvent>()
  })

  it('forwards provider, query, kind, limit and cursor', async () => {
    let params: URLSearchParams | undefined
    server.use(
      http.get(EVENTS_URL, ({ request }) => {
        params = new URL(request.url).searchParams
        return HttpResponse.json({
          data: [],
          sources: [],
          pagination: { limit: 20, cursor: null, hasMore: false },
        })
      })
    )

    const { client } = makeTestHttpClient()
    await createIntegrationsResource(client).events.list({
      provider: 'posthog',
      query: 'project',
      kind: 'custom',
      limit: 20,
      cursor: 'c2Vlazo0MA',
    })

    expect(params?.get('provider')).toBe('posthog')
    expect(params?.get('query')).toBe('project')
    expect(params?.get('kind')).toBe('custom')
    expect(params?.get('limit')).toBe('20')
    expect(params?.get('cursor')).toBe('c2Vlazo0MA')
  })

  it('types kind as the spec enum', () => {
    expectTypeOf<IntegrationEventKind>().toEqualTypeOf<
      'standard' | 'custom' | 'action' | 'derived' | 'observed'
    >()
    expectTypeOf<ListIntegrationEventsInput['kind']>().toEqualTypeOf<
      IntegrationEventKind | undefined
    >()
  })

  it('returns the full BrewRawResponse with { raw: true }', async () => {
    server.use(
      http.get(EVENTS_URL, () =>
        HttpResponse.json(
          {
            data: [EVENT],
            sources: [SOURCE],
            pagination: { limit: 100, cursor: 'next', hasMore: true },
          },
          { headers: { 'x-request-id': 'req_events' } }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const raw = await createIntegrationsResource(client).events.list(
      undefined,
      { raw: true }
    )

    expect(raw.requestId).toBe('req_events')
    expect(raw.data.pagination.cursor).toBe('next')
  })
})

describe('integrations.events.get', () => {
  it('GETs /v1/integrations/events/{eventId} and returns the event with its properties', async () => {
    let url: URL | undefined
    server.use(
      http.get(`${EVENTS_URL}/:eventId`, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(DETAIL)
      })
    )

    const { client } = makeTestHttpClient()
    const event = await createIntegrationsResource(client).events.get(
      EVENT.eventId
    )

    expect(url?.pathname).toBe(`/api/v1/integrations/events/${EVENT.eventId}`)
    expect(url?.search).toBe('')
    expect(event.properties.map((property) => property.variable)).toEqual([
      'properties.project_name',
      'person.first_name',
    ])
    expect(event.properties[1]?.isPersonal).toBe(true)
    expectTypeOf(event).toEqualTypeOf<IntegrationEventDetail>()
  })

  it('URL-encodes the eventId path segment', async () => {
    let pathname: string | undefined
    server.use(
      http.get(`${EVENTS_URL}/:eventId`, ({ request }) => {
        pathname = new URL(request.url).pathname
        return HttpResponse.json(DETAIL)
      })
    )

    const { client } = makeTestHttpClient()
    await createIntegrationsResource(client).events.get('a/b c')

    expect(pathname).toBe('/api/v1/integrations/events/a%2Fb%20c')
  })

  it('surfaces an unknown or other-brand id as 404 INTEGRATION_EVENT_NOT_FOUND', async () => {
    server.use(
      http.get(`${EVENTS_URL}/:eventId`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'INTEGRATION_EVENT_NOT_FOUND',
              type: 'not_found',
              message: 'No live integration event with that id exists.',
              param: 'eventId',
              suggestion:
                'List the brand’s live integration events with GET /v1/integrations/events and pass an `eventId` from it.',
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 404, headers: { 'x-request-id': 'req_404' } }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const failure = await createIntegrationsResource(client)
      .events.get('evt_missing')
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BrewApiError)
    expect(failure).toMatchObject({
      status: 404,
      code: 'INTEGRATION_EVENT_NOT_FOUND',
      requestId: 'req_404',
    })
  })
})
