import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListAutomationVersionsInput = {
  automationId: string
} & operations['listAutomationVersions']['parameters']['query']

/** Version history returns the uniform `{ data, pagination }` envelope. */
export type AutomationVersionsResponse =
  components['schemas']['AutomationVersionsResponse']

/**
 * `GET /v1/automations/{automationId}/versions` — the automation's
 * version history under the uniform `{ data, pagination }` envelope,
 * `latest` first then numeric descending. Rows are LEAN (graph
 * stripped). Pin a historical `automationVersionId` on publish to
 * promote that exact graph. Page with `limit` / `cursor`.
 */
export function createListAutomationVersions(client: HttpClient) {
  function automationVersions(
    input: ListAutomationVersionsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AutomationVersionsResponse>>
  function automationVersions(
    input: ListAutomationVersionsInput,
    options?: RequestOptions
  ): Promise<AutomationVersionsResponse>
  async function automationVersions(
    input: ListAutomationVersionsInput,
    options?: RequestOptions
  ): Promise<
    AutomationVersionsResponse | BrewRawResponse<AutomationVersionsResponse>
  > {
    const { automationId, ...query } = input
    const response = await client.request<AutomationVersionsResponse>({
      method: 'GET',
      path: `/v1/automations/${encodeURIComponent(automationId)}/versions`,
      ...(Object.keys(query).length > 0 ? { query } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return automationVersions
}
