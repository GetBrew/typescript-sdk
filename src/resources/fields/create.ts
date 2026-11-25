import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { CreateFieldResponse } from './types'

export type { CreateFieldResponse }

export type CreateFieldInput = components['schemas']['FieldsPostRequest']

export function createCreateField(client: HttpClient) {
  function create(
    input: CreateFieldInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CreateFieldResponse>>
  function create(
    input: CreateFieldInput,
    options?: RequestOptions
  ): Promise<CreateFieldResponse>
  async function create(
    input: CreateFieldInput,
    options?: RequestOptions
  ): Promise<CreateFieldResponse | BrewRawResponse<CreateFieldResponse>> {
    const response = await client.request<CreateFieldResponse>({
      method: 'POST',
      path: '/v1/fields',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return create
}
