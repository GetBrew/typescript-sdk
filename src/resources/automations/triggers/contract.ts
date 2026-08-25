import { type HttpClient, unwrapResponse } from '../../../core/http'
import type { components } from '../../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../../types'

/**
 * Stored payload contracts for the trigger plane (Wave 2). `getContract`
 * returns the stored contract when one is declared and the derived one
 * otherwise (`source` discriminates); `putContract` declares it or
 * changes how it is enforced — all three body fields (`fields`, `name`,
 * `enforcement`) are optional, so arming a contract is a one-field patch;
 * `validatePayload` dry-runs a payload through the SAME validator the
 * fire path uses — an invalid payload resolves (not throws) with
 * `valid: false`.
 */

export type ContractFormat = 'json' | 'ts' | 'zod' | 'jsonschema' | 'skill'

export type PayloadContractGetResponse =
  components['schemas']['PayloadContractGetResponse']
export type PayloadContractField =
  components['schemas']['PayloadContractFieldNode']
export type PayloadContractPutRequest =
  components['schemas']['PayloadContractPutRequest']
export type PayloadContractValidateResponse =
  components['schemas']['PayloadContractValidateResponse']

export type GetTriggerContractInput = {
  triggerEventId: string
  /** `json` (default) returns the contract; text formats return `{format, content}`. */
  format?: ContractFormat
}

export type PutTriggerContractInput = PayloadContractPutRequest & {
  triggerEventId: string
}

export type ValidateTriggerPayloadInput = {
  triggerEventId: string
  payload: Record<string, unknown>
  /** Preview a different mode than the stored one. */
  enforcement?: 'prune' | 'strict'
}

/**
 * `GET /v1/automations/triggers/{triggerEventId}/contract` (scope:
 * `automations`) — the payload contract for a trigger. Pass
 * `format: 'ts' | 'zod' | 'jsonschema' | 'skill'` for generated
 * code/docs as `{format, content}`.
 *
 * Pass `{ raw: true }` in `options` for the full
 * `BrewRawResponse<PayloadContractGetResponse>`.
 */
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

/**
 * `PUT /v1/automations/triggers/{triggerEventId}/contract` (scope:
 * `automations`) — declare (or replace) the stored contract. The tree is
 * validated before any write (trigger contracts keep a top-level
 * required `email` string; nested fields need the Liquid engine); the
 * version bumps only on behavioral change. Responds with the same body a
 * follow-up `getContract` would return.
 */
export function createPutTriggerContract(client: HttpClient) {
  function putContract(
    input: PutTriggerContractInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PayloadContractGetResponse>>
  function putContract(
    input: PutTriggerContractInput,
    options?: RequestOptions
  ): Promise<PayloadContractGetResponse>
  async function putContract(
    input: PutTriggerContractInput,
    options?: RequestOptions
  ): Promise<
    PayloadContractGetResponse | BrewRawResponse<PayloadContractGetResponse>
  > {
    const { triggerEventId, ...body } = input
    const response = await client.request<PayloadContractGetResponse>({
      method: 'PUT',
      path: `/v1/automations/triggers/${encodeURIComponent(triggerEventId)}/contract`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return putContract
}

/**
 * `POST /v1/automations/triggers/{triggerEventId}/contract/validate`
 * (scope: `automations`) — dry-run a payload against the trigger's
 * contract. Nothing fires; an invalid payload resolves with
 * `valid: false` plus per-field `errors`/`warnings`, the
 * fallback-resolved `resolvedPayload`, and `prunedKeys`.
 */
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
