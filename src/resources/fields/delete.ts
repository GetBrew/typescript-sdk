import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { FieldsSuccessResponse } from './types'

export type DeleteFieldInput = components['schemas']['FieldsDeleteRequest']

/**
 * Remove a custom field from the contacts schema. **Destructive**: this
 * drops the column from every existing contact.
 *
 * DELETE retries on transient failures by default. Re-deleting a field
 * that no longer exists is safe — the server treats it as success.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<FieldsSuccessResponse>` instead of the unwrapped
 * payload.
 */
export function createDeleteField(client: HttpClient) {
  function deleteField(
    input: DeleteFieldInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<FieldsSuccessResponse>>
  function deleteField(
    input: DeleteFieldInput,
    options?: RequestOptions
  ): Promise<FieldsSuccessResponse>
  async function deleteField(
    input: DeleteFieldInput,
    options?: RequestOptions
  ): Promise<FieldsSuccessResponse | BrewRawResponse<FieldsSuccessResponse>> {
    const response = await client.request<FieldsSuccessResponse>({
      method: 'DELETE',
      path: '/v1/fields',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteField
}
