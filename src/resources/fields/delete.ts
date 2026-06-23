import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { FieldsDeleteResponse } from './types'

export type { FieldsDeleteResponse }

/** Input for `brew.fields.delete(...)` — the field name to drop. */
export type DeleteFieldInput = { readonly fieldName: string }

/**
 * `DELETE /v1/fields/{fieldName}` — remove a custom field from the
 * contacts schema. Requires the `contacts` scope. **Destructive**: this
 * drops the column from every existing contact.
 *
 * DELETE retries on transient failures by default. Idempotent:
 * re-deleting a field that no longer exists resolves with
 * `{ deleted: false }` rather than throwing.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<FieldsDeleteResponse>` instead of the unwrapped
 * payload.
 */
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
