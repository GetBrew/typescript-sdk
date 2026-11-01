import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { createBrewClient } from '../../src/client'
import { BrewApiError } from '../../src/core/errors'
import { server } from '../msw/server'

const base = 'https://brew.new/api/v1/agent-goals'
const goal = { goalId: 'goal_1', name: 'Weekly newsletter', status: 'paused' }
const createInput = {
  name: 'Weekly newsletter',
  objective: 'Grow repeat purchases',
  audienceId: 'aud_1',
  cadence: { intervalDays: 7, timeZone: 'Asia/Seoul' },
  planningHorizonDays: 28,
  successMetric: 'Conversions',
  budget: {
    maxRecipients: 1000,
    maxSpendCredits: 100,
    maxCampaigns: 4,
    periodDays: 28,
  },
}
const client = () =>
  createBrewClient({ apiKey: 'brew_sdk_test', brandId: 'brand_1' })

describe('agentGoals', () => {
  it('creates a brand-scoped goal with its caller supplied replay identity', async () => {
    let requestBody: unknown
    let requestHeaders: Headers | undefined
    server.use(
      http.post(base, async ({ request }) => {
        requestBody = await request.json()
        requestHeaders = request.headers
        return HttpResponse.json(goal, { status: 201 })
      })
    )
    await expect(
      client().agentGoals.create(createInput, {
        idempotencyKey: 'goal_create_1',
      })
    ).resolves.toEqual(goal)
    expect(requestBody).toEqual(createInput)
    expect(requestHeaders?.get('x-brand-id')).toBe('brand_1')
    expect(requestHeaders?.get('idempotency-key')).toBe('goal_create_1')
  })

  it('encodes goal identity and preserves raw response access', async () => {
    let path: string | undefined
    server.use(
      http.get(`${base}/:goalId`, ({ request }) => {
        path = new URL(request.url).pathname
        return HttpResponse.json({
          goal,
          grant: null,
          executions: [],
          files: [],
          updates: [],
          approvals: [],
        })
      })
    )
    const result = await client().agentGoals.get('goal/one', { raw: true })
    expect(path).toBe('/api/v1/agent-goals/goal%2Fone')
    expect(result.data.goal).toEqual(goal)
  })

  it('passes pagination and updates only the requested lifecycle attribute', async () => {
    let query: URLSearchParams | undefined
    let body: unknown
    server.use(
      http.get(base, ({ request }) => {
        query = new URL(request.url).searchParams
        return HttpResponse.json({
          data: [goal],
          pagination: { cursor: null, hasMore: false, limit: 5 },
        })
      }),
      http.patch(`${base}/:goalId`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(goal)
      })
    )
    const brew = client()
    await brew.agentGoals.list({ limit: 5, cursor: 'after_1' })
    await brew.agentGoals.update({ goalId: 'goal_1', status: 'paused' })
    expect(query?.get('limit')).toBe('5')
    expect(query?.get('cursor')).toBe('after_1')
    expect(body).toEqual({ status: 'paused' })
  })

  it('retains a publication conflict without repeating the write', async () => {
    let requests = 0
    server.use(
      http.post(`${base}/:goalId/documents`, async ({ request }) => {
        requests += 1
        expect(await request.json()).toEqual({
          path: 'plan.md',
          content: 'Changed plan',
          expectedRevision: 2,
        })
        return HttpResponse.json(
          {
            error: {
              code: 'CONFLICT',
              type: 'conflict',
              message: 'Revision changed',
            },
          },
          { status: 409 }
        )
      })
    )
    await expect(
      client().agentGoals.publishDocument({
        goalId: 'goal_1',
        path: 'plan.md',
        content: 'Changed plan',
        expectedRevision: 2,
      })
    ).rejects.toBeInstanceOf(BrewApiError)
    expect(requests).toBe(1)
  })

  it('schedules the supplied occurrence and lists task and document pages', async () => {
    let body: unknown
    server.use(
      http.post(`${base}/:goalId/follow-ups`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(
          { goalId: 'goal_1', wakeId: 'wake_1' },
          { status: 201 }
        )
      }),
      http.get(`${base}/:goalId/tasks`, () =>
        HttpResponse.json({
          data: [],
          pagination: { cursor: null, hasMore: false, limit: 5 },
        })
      ),
      http.get(`${base}/:goalId/documents`, () =>
        HttpResponse.json({
          data: [],
          pagination: { cursor: null, hasMore: false, limit: 5 },
        })
      )
    )
    const brew = client()
    await brew.agentGoals.followUp({
      goalId: 'goal_1',
      message: 'Review results',
      sourceId: 'campaign_1:review',
      dueAt: '2027-01-01T00:00:00.000Z',
    })
    expect(body).toEqual({
      message: 'Review results',
      sourceId: 'campaign_1:review',
      dueAt: '2027-01-01T00:00:00.000Z',
    })
    await expect(
      brew.agentGoals.tasks({ goalId: 'goal_1', limit: 5 })
    ).resolves.toMatchObject({ data: [] })
    await expect(
      brew.agentGoals.documents({ goalId: 'goal_1', limit: 5 })
    ).resolves.toMatchObject({ data: [] })
  })
})
