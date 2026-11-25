import { type HttpClient, unwrapResponse } from '../../core/http'
import type { components } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type InferPayloadContractInput = {
  example: Record<string, unknown>
  subjectKind?: NonNullable<
    components['schemas']['PayloadContractInferRequest']['subjectKind']
  >
}

export type PayloadContractInferResponse =
  components['schemas']['PayloadContractInferResponse']

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
      body: {
        example: input.example,
        ...(input.subjectKind === undefined
          ? {}
          : { subjectKind: input.subjectKind }),
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return infer
}
