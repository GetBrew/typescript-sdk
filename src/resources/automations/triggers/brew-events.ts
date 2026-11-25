import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { components } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

export type EnsureBrewEventTriggerInput =
  components['schemas']['BrewEventTriggersPostRequest']

export type EnsureBrewEventTriggerResponse =
  components['schemas']['BrewEventTriggerSaved']

export function createEnsureBrewEventTrigger(client: HttpClient) {
  function ensureBrewEvent(
    input: EnsureBrewEventTriggerInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EnsureBrewEventTriggerResponse>>
  function ensureBrewEvent(
    input: EnsureBrewEventTriggerInput,
    options?: RequestOptions
  ): Promise<EnsureBrewEventTriggerResponse>
  async function ensureBrewEvent(
    input: EnsureBrewEventTriggerInput,
    options?: RequestOptions
  ): Promise<
    | EnsureBrewEventTriggerResponse
    | BrewRawResponse<EnsureBrewEventTriggerResponse>
  > {
    const response = await client.request<EnsureBrewEventTriggerResponse>({
      method: 'POST',
      path: '/v1/automations/triggers/brew-events',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return ensureBrewEvent
}
