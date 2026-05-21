import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Trigger } from './types'

/**
 * Deterministic create input. Caller supplies the full trigger
 * definition (`title`, `description?`, `payloadSchema`) — see the
 * API reference for the strict shape. The server hardcodes
 * `provider: 'brew_api'` — every trigger created through the public
 * API is a custom Brew-API trigger. Integration triggers (clerk,
 * stripe, shopify, …) are provisioned by the corresponding
 * integration only; they're listable via `brew.triggers.list()` but
 * cannot be authored through `brew.triggers.create()`.
 *
 * AI authoring is intentionally not exposed on the public SDK
 * surface; chain deterministic calls for HTTP / SDK consumers.
 */
export type CreateTriggerInput = {
  title: string
  description?: string
  payloadSchema: {
    type: 'object'
    fields: ReadonlyArray<{
      key: string
      type: 'string' | 'int' | 'boolean'
      required: boolean
      fallbackValue?: string | number | boolean
      pii?: 'none' | 'low' | 'high'
    }>
  }
}

export type CreateTriggerResponse = { trigger: Trigger }

/**
 * `POST /v1/triggers` deterministic create.
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
      path: '/v1/triggers',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return createTrigger
}
