import { type HttpClient, unwrapResponse } from '../../../core/http'
import type {
  components,
  SendPayloadValue,
} from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

type DefaultFirePayload = {
  [key: string]: SendPayloadValue
}

export type FireTriggerInput<
  TPayload extends Record<string, unknown> = DefaultFirePayload,
> = {
  triggerEventId: string
} & Omit<components['schemas']['TriggerFireRequest'], 'payload'> & {
    payload: TPayload
  }

export type FireTriggerResponse = components['schemas']['TriggerFireAccepted']

export function createFireTrigger(client: HttpClient) {
  function fireTrigger<
    TPayload extends Record<string, unknown> = DefaultFirePayload,
  >(
    input: FireTriggerInput<TPayload>,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<FireTriggerResponse>>
  function fireTrigger<
    TPayload extends Record<string, unknown> = DefaultFirePayload,
  >(
    input: FireTriggerInput<TPayload>,
    options?: RequestOptions
  ): Promise<FireTriggerResponse>
  async function fireTrigger(
    input: FireTriggerInput,
    options?: RequestOptions
  ): Promise<FireTriggerResponse | BrewRawResponse<FireTriggerResponse>> {
    const { triggerEventId, ...body } = input
    const response = await client.request<FireTriggerResponse>({
      method: 'POST',
      path: `/v1/automations/triggers/${encodeURIComponent(triggerEventId)}/fire`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return fireTrigger
}
