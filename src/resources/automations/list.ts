import type { PaginationInput } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AutomationsListResponse } from './types'

export type ListAutomationsResponse = AutomationsListResponse

/**
 * Input to `brew.automations.list`. The list is lean by default — rows
 * omit `nodes`/`connections` unless `include: ['graph']` is passed.
 * `limit`/`cursor` page the result.
 */
export type ListAutomationsInput = PaginationInput & {
  /** `'graph'` attaches `nodes`+`connections` to each list row. */
  readonly include?: ReadonlyArray<'graph'>
}

/**
 * `GET /v1/automations` — list every latest automation row in the
 * brand. Returns `{ automations, pagination }`. Rows are LEAN by
 * default (no `nodes`/`connections`); pass `include: ['graph']` to
 * attach the graph. For a single row use `brew.automations.get(...)` —
 * it always returns the full graph (one-element array, or `404
 * AUTOMATION_NOT_FOUND`).
 */
export function createListAutomations(client: HttpClient) {
  function listAutomations(
    input: ListAutomationsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListAutomationsResponse>>
  function listAutomations(
    input?: ListAutomationsInput,
    options?: RequestOptions
  ): Promise<ListAutomationsResponse>
  async function listAutomations(
    input: ListAutomationsInput = {},
    options?: RequestOptions
  ): Promise<
    ListAutomationsResponse | BrewRawResponse<ListAutomationsResponse>
  > {
    const query: Record<string, string | number | undefined> = {
      limit: input.limit,
      cursor: input.cursor,
    }
    if (input.include && input.include.length > 0) {
      query.include = input.include.join(',')
    }
    const response = await client.request<ListAutomationsResponse>({
      method: 'GET',
      path: '/v1/automations',
      query,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listAutomations
}

export type GetAutomationInput = {
  automationId: string
  /**
   * Optional include token. `'versions'` attaches the full version
   * history on the row inline (`automations[0].versions[]`).
   */
  include?: ReadonlyArray<'versions'>
}

/**
 * Single-row get returns the same `{ automations: [...] }` envelope
 * as list mode — a one-element array (or `404
 * AUTOMATION_NOT_FOUND` when missing). Use
 * `result.automations[0]` to destructure the row; the optional
 * `versions[]` history (when `?include=versions`) is on that row.
 */
export type GetAutomationResponse = AutomationsListResponse

export function createGetAutomation(client: HttpClient) {
  function getAutomation(
    input: GetAutomationInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetAutomationResponse>>
  function getAutomation(
    input: GetAutomationInput,
    options?: RequestOptions
  ): Promise<GetAutomationResponse>
  async function getAutomation(
    input: GetAutomationInput,
    options?: RequestOptions
  ): Promise<GetAutomationResponse | BrewRawResponse<GetAutomationResponse>> {
    const query: Record<string, string> = {
      automationId: input.automationId,
    }
    if (input.include && input.include.length > 0) {
      query.include = input.include.join(',')
    }
    const response = await client.request<GetAutomationResponse>({
      method: 'GET',
      path: '/v1/automations',
      query,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAutomation
}
