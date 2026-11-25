import { unwrapResponse, type HttpClient } from '../../../core/http'
import { serializeInclude } from '../../../core/url'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { Trigger } from './types'

export const TRIGGERS_INCLUDE_TOKENS = ['skill'] as const
export type TriggersIncludeToken = (typeof TRIGGERS_INCLUDE_TOKENS)[number]

export type GetTriggerOptions = RequestOptions & {
  readonly include?: ReadonlyArray<TriggersIncludeToken> | string
}

export type GetTriggerResponse = Trigger

export function createGetTrigger(client: HttpClient) {
  function getTrigger(
    triggerEventId: string,
    options: GetTriggerOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetTriggerResponse>>
  function getTrigger(
    triggerEventId: string,
    options?: GetTriggerOptions
  ): Promise<GetTriggerResponse>
  async function getTrigger(
    triggerEventId: string,
    options?: GetTriggerOptions
  ): Promise<GetTriggerResponse | BrewRawResponse<GetTriggerResponse>> {
    const include = serializeInclude({ include: options?.include })
    const response = await client.request<GetTriggerResponse>({
      method: 'GET',
      path: `/v1/automations/triggers/${encodeURIComponent(triggerEventId)}`,
      ...(include !== undefined ? { query: { include } } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getTrigger
}
