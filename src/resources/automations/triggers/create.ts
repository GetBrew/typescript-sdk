import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { components } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { Trigger } from './types'

export type CreateTriggerInput = components['schemas']['TriggersPostRequest']

export type CreateTriggerResponse = Trigger

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
