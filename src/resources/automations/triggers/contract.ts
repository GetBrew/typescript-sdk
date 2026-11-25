import { type HttpClient, unwrapResponse } from '../../../core/http'
import type { components } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

export type ContractFormat = 'json' | 'ts' | 'zod' | 'jsonschema' | 'skill'

export type PayloadContractGetResponse =
  components['schemas']['PayloadContractGetResponse']
export type PayloadContractField =
  components['schemas']['PayloadContractFieldNode']
export type PayloadContractPutRequest =
  components['schemas']['PayloadContractPutRequest']
export type PayloadContractPutResponse =
  components['schemas']['PayloadContractPutResponse']
export type PayloadContractValidateResponse =
  components['schemas']['PayloadContractValidateResponse']

export type GetTriggerContractInput = {
  triggerEventId: string
  format?: ContractFormat
}

export type PutTriggerContractInput = PayloadContractPutRequest & {
  triggerEventId: string
}

export type ValidateTriggerPayloadInput = {
  triggerEventId: string
  payload: Record<string, unknown>
  enforcement?: 'prune' | 'strict'
}

export function createGetTriggerContract(client: HttpClient) {
  function getContract(
    input: GetTriggerContractInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PayloadContractGetResponse>>
  function getContract(
    input: GetTriggerContractInput,
    options?: RequestOptions
  ): Promise<PayloadContractGetResponse>
  async function getContract(
    input: GetTriggerContractInput,
    options?: RequestOptions
  ): Promise<
    PayloadContractGetResponse | BrewRawResponse<PayloadContractGetResponse>
  > {
    const response = await client.request<PayloadContractGetResponse>({
      method: 'GET',
      path: `/v1/automations/triggers/${encodeURIComponent(input.triggerEventId)}/contract`,
      query: { format: input.format },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getContract
}

export function createPutTriggerContract(client: HttpClient) {
  function putContract(
    input: PutTriggerContractInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PayloadContractPutResponse>>
  function putContract(
    input: PutTriggerContractInput,
    options?: RequestOptions
  ): Promise<PayloadContractPutResponse>
  async function putContract(
    input: PutTriggerContractInput,
    options?: RequestOptions
  ): Promise<
    PayloadContractPutResponse | BrewRawResponse<PayloadContractPutResponse>
  > {
    const { triggerEventId, ...body } = input
    const response = await client.request<PayloadContractPutResponse>({
      method: 'PUT',
      path: `/v1/automations/triggers/${encodeURIComponent(triggerEventId)}/contract`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return putContract
}

export function createValidateTriggerPayload(client: HttpClient) {
  function validatePayload(
    input: ValidateTriggerPayloadInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PayloadContractValidateResponse>>
  function validatePayload(
    input: ValidateTriggerPayloadInput,
    options?: RequestOptions
  ): Promise<PayloadContractValidateResponse>
  async function validatePayload(
    input: ValidateTriggerPayloadInput,
    options?: RequestOptions
  ): Promise<
    | PayloadContractValidateResponse
    | BrewRawResponse<PayloadContractValidateResponse>
  > {
    const { triggerEventId, ...body } = input
    const response = await client.request<PayloadContractValidateResponse>({
      method: 'POST',
      path: `/v1/automations/triggers/${encodeURIComponent(triggerEventId)}/contract/validate`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return validatePayload
}
