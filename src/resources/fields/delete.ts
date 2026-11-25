import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { FieldsDeleteResponse } from './types'

export type { FieldsDeleteResponse }

export type DeleteFieldInput = { readonly fieldName: string }

export function createDeleteField(client: HttpClient) {
  function deleteField(
    input: DeleteFieldInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<FieldsDeleteResponse>>
  function deleteField(
    input: DeleteFieldInput,
    options?: RequestOptions
  ): Promise<FieldsDeleteResponse>
  async function deleteField(
    input: DeleteFieldInput,
    options?: RequestOptions
  ): Promise<FieldsDeleteResponse | BrewRawResponse<FieldsDeleteResponse>> {
    const response = await client.request<FieldsDeleteResponse>({
      method: 'DELETE',
      path: `/v1/fields/${encodeURIComponent(input.fieldName)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteField
}
