import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AutomationAnalyticsResponse } from './types'

export type { AutomationAnalyticsResponse }

/**
 * Windowed per-automation analytics input. When `from`/`to` are
 * omitted the API defaults to the last 30 days. `automationId` narrows
 * to a single automation; `limit` caps the per-automation fan-out
 * (1–100). All fields optional.
 */
export type AutomationAnalyticsInput = {
  from?: string
  to?: string
  automationId?: string
  limit?: number
}

function buildQuery(
  input: AutomationAnalyticsInput | undefined
): Record<string, string> | undefined {
  if (!input) return undefined
  const query: Record<string, string> = {}
  if (input.from !== undefined) query.from = input.from
  if (input.to !== undefined) query.to = input.to
  if (input.automationId !== undefined) query.automationId = input.automationId
  if (input.limit !== undefined) query.limit = String(input.limit)
  return Object.keys(query).length > 0 ? query : undefined
}

/**
 * `GET /v1/analytics/automations` — windowed per-automation
 * performance + brand totals (reflects LIVE runs only). Read-only;
 * requires the `automations` scope.
 */
export function createAutomationAnalytics(client: HttpClient) {
  function automationAnalytics(
    input: AutomationAnalyticsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AutomationAnalyticsResponse>>
  function automationAnalytics(
    input?: AutomationAnalyticsInput,
    options?: RequestOptions
  ): Promise<AutomationAnalyticsResponse>
  async function automationAnalytics(
    input?: AutomationAnalyticsInput,
    options?: RequestOptions
  ): Promise<
    AutomationAnalyticsResponse | BrewRawResponse<AutomationAnalyticsResponse>
  > {
    const query = buildQuery(input)
    const response = await client.request<AutomationAnalyticsResponse>({
      method: 'GET',
      path: '/v1/analytics/automations',
      ...(query ? { query } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return automationAnalytics
}
