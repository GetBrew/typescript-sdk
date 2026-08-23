import { type HttpClient, unwrapResponse } from '../../core/http'
import type { components } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContractFormat } from '../automations/triggers/contract'

/**
 * Stored payload contracts for the transactional plane (Wave 2). Same
 * shapes as the trigger plane; the derived fallback here is collected
 * from the pinned template's variables rather than a flat schema, and
 * there is no `email` field invariant.
 */

export type PayloadContractGetResponse =
  components['schemas']['PayloadContractGetResponse']
export type PayloadContractPutRequest =
  components['schemas']['PayloadContractPutRequest']
export type PayloadContractValidateResponse =
  components['schemas']['PayloadContractValidateResponse']

export type GetTransactionalContractInput = {
  transactionId: string
  /** `json` (default) returns the contract; text formats return `{format, content}`. */
  format?: ContractFormat
}

export type PutTransactionalContractInput = PayloadContractPutRequest & {
  transactionId: string
}

export type ValidateTransactionalPayloadInput = {
  transactionId: string
  payload: Record<string, unknown>
  /** Preview a different mode than the stored one. */
  enforcement?: 'strict' | 'prune' | 'passthrough'
}

/**
 * `GET /v1/transactional/{transactionId}/contract` (scope: `sends`) —
 * the payload contract for a transactional email. Pass
 * `format: 'ts' | 'zod' | 'jsonschema' | 'skill'` for generated
 * code/docs as `{format, content}`.
 */
export function createGetTransactionalContract(client: HttpClient) {
  function getContract(
    input: GetTransactionalContractInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PayloadContractGetResponse>>
  function getContract(
    input: GetTransactionalContractInput,
    options?: RequestOptions
  ): Promise<PayloadContractGetResponse>
  async function getContract(
    input: GetTransactionalContractInput,
    options?: RequestOptions
  ): Promise<
    PayloadContractGetResponse | BrewRawResponse<PayloadContractGetResponse>
  > {
    const response = await client.request<PayloadContractGetResponse>({
      method: 'GET',
      path: `/v1/transactional/${encodeURIComponent(input.transactionId)}/contract`,
      query: { format: input.format },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getContract
}

/**
 * `PUT /v1/transactional/{transactionId}/contract` (scope: `sends`) —
 * declare (or replace) the stored contract. Tree-validated before any
 * write; version bumps only on behavioral change. Responds with the
 * same body a follow-up `getContract` would return.
 */
export function createPutTransactionalContract(client: HttpClient) {
  function putContract(
    input: PutTransactionalContractInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PayloadContractGetResponse>>
  function putContract(
    input: PutTransactionalContractInput,
    options?: RequestOptions
  ): Promise<PayloadContractGetResponse>
  async function putContract(
    input: PutTransactionalContractInput,
    options?: RequestOptions
  ): Promise<
    PayloadContractGetResponse | BrewRawResponse<PayloadContractGetResponse>
  > {
    const { transactionId, ...body } = input
    const response = await client.request<PayloadContractGetResponse>({
      method: 'PUT',
      path: `/v1/transactional/${encodeURIComponent(transactionId)}/contract`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return putContract
}

/**
 * `POST /v1/transactional/{transactionId}/contract/validate` (scope:
 * `sends`) — dry-run a `emails.send` payload against the contract.
 * Nothing sends; an invalid payload resolves with `valid: false`.
 */
export function createValidateTransactionalPayload(client: HttpClient) {
  function validateContract(
    input: ValidateTransactionalPayloadInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PayloadContractValidateResponse>>
  function validateContract(
    input: ValidateTransactionalPayloadInput,
    options?: RequestOptions
  ): Promise<PayloadContractValidateResponse>
  async function validateContract(
    input: ValidateTransactionalPayloadInput,
    options?: RequestOptions
  ): Promise<
    | PayloadContractValidateResponse
    | BrewRawResponse<PayloadContractValidateResponse>
  > {
    const { transactionId, ...body } = input
    const response = await client.request<PayloadContractValidateResponse>({
      method: 'POST',
      path: `/v1/transactional/${encodeURIComponent(transactionId)}/contract/validate`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return validateContract
}
