import { unwrapResponse, type HttpClient } from '../../core/http'
import { serializeInclude } from '../../core/url'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Automation } from './types'

export const AUTOMATIONS_INCLUDE_TOKENS = ['graph', 'versions'] as const
export type AutomationsIncludeToken =
  (typeof AUTOMATIONS_INCLUDE_TOKENS)[number]

export type GetAutomationOptions = RequestOptions & {
  readonly include?: ReadonlyArray<AutomationsIncludeToken> | string
}

export type GetAutomationResponse = Automation

export function createGetAutomation(client: HttpClient) {
  function getAutomation(
    automationId: string,
    options: GetAutomationOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetAutomationResponse>>
  function getAutomation(
    automationId: string,
    options?: GetAutomationOptions
  ): Promise<GetAutomationResponse>
  async function getAutomation(
    automationId: string,
    options?: GetAutomationOptions
  ): Promise<GetAutomationResponse | BrewRawResponse<GetAutomationResponse>> {
    const include = serializeInclude({ include: options?.include })
    const response = await client.request<GetAutomationResponse>({
      method: 'GET',
      path: `/v1/automations/${encodeURIComponent(automationId)}`,
      ...(include !== undefined ? { query: { include } } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAutomation
}
