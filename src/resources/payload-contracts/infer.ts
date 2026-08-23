import { type HttpClient, unwrapResponse } from '../../core/http'
import type { components } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type InferPayloadContractInput = {
  /** A real example payload — the JSON your system sends. */
  example: Record<string, unknown>
}

export type PayloadContractInferResponse =
  components['schemas']['PayloadContractInferResponse']

/**
 * `POST /v1/payload-contracts/infer` (scope: `automations`) — draft a
 * contract from a real example payload. Integers/floats split
 * automatically, full ISO timestamps become `date`, object/array shapes
 * are walked recursively; un-inferable spots (nulls, empty arrays) are
 * listed in `issues`. Nothing is saved — review the draft, then
 * `putContract` it on a trigger or transactional email.
 *
 * Pass `{ raw: true }` in `options` for the full
 * `BrewRawResponse<PayloadContractInferResponse>`.
 */
export function createInferPayloadContract(client: HttpClient) {
  function infer(
    input: InferPayloadContractInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PayloadContractInferResponse>>
  function infer(
    input: InferPayloadContractInput,
    options?: RequestOptions
  ): Promise<PayloadContractInferResponse>
  async function infer(
    input: InferPayloadContractInput,
    options?: RequestOptions
  ): Promise<
    PayloadContractInferResponse | BrewRawResponse<PayloadContractInferResponse>
  > {
    const response = await client.request<PayloadContractInferResponse>({
      method: 'POST',
      path: '/v1/payload-contracts/infer',
      body: { example: input.example },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return infer
}
