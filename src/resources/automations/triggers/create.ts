import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { components } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { Trigger } from './types'

/**
 * Deterministic create input. Caller supplies the full trigger
 * definition (`title`, `description?`, `payloadSchema`). The server
 * hardcodes `provider: 'brew_api'` — every trigger created through the
 * public API is a custom Brew-API trigger. Integration triggers (clerk,
 * stripe, shopify, …) are provisioned by the corresponding integration
 * only; they're listable via `brew.automations.triggers.list()` but
 * cannot be authored here.
 *
 * `payloadSchema.fields` MUST declare `{ key: 'email', type: 'string',
 * required: true }` so downstream automations can resolve a recipient.
 */
export type CreateTriggerInput = components['schemas']['TriggersPostRequest']

/**
 * Create returns the bare created `Trigger` row (HTTP 201).
 */
export type CreateTriggerResponse = Trigger

/**
 * `POST /v1/automations/triggers` deterministic create.
 */
export function createCreateTrigger(client: HttpClient) {
  function createTrigger(
    input: CreateTriggerInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CreateTriggerResponse>>
  function createTrigger(
    input: CreateTriggerInput,
    options?: RequestOptions
  ): Promise<CreateTriggerResponse>
  async function createTrigger(
    input: CreateTriggerInput,
    options?: RequestOptions
  ): Promise<CreateTriggerResponse | BrewRawResponse<CreateTriggerResponse>> {
    const response = await client.request<CreateTriggerResponse>({
      method: 'POST',
      path: '/v1/automations/triggers',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return createTrigger
}
