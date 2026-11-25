import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { components, operations } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

export type EnsureIntegrationEventTriggerInput =
  components['schemas']['IntegrationEventTriggersPostRequest']

type Responses = operations['ensureIntegrationEventTrigger']['responses']

type SavedStatus = 200 | 201

export type EnsureIntegrationEventTriggerResponse =
  Responses[SavedStatus]['content']['application/json']

export function createEnsureIntegrationEventTrigger(client: HttpClient) {
  function ensureIntegrationEvent(
    input: EnsureIntegrationEventTriggerInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EnsureIntegrationEventTriggerResponse>>
  function ensureIntegrationEvent(
    input: EnsureIntegrationEventTriggerInput,
    options?: RequestOptions
  ): Promise<EnsureIntegrationEventTriggerResponse>
  async function ensureIntegrationEvent(
    input: EnsureIntegrationEventTriggerInput,
    options?: RequestOptions
  ): Promise<
    | EnsureIntegrationEventTriggerResponse
    | BrewRawResponse<EnsureIntegrationEventTriggerResponse>
  > {
    const response =
      await client.request<EnsureIntegrationEventTriggerResponse>({
        method: 'POST',
        path: '/v1/automations/triggers/integration-events',
        body: input,
        ...(options ? { options } : {}),
      })
    return unwrapResponse(response, options)
  }
  return ensureIntegrationEvent
}
