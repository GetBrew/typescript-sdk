import type { components } from '../../generated/openapi-types'
import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

import type { FieldsSuccessResponse } from './types'

export type DeleteFieldInput = components['schemas']['FieldsDeleteRequest']

/**
 * Remove a custom field from the contacts schema. **Destructive**: this
 * drops the column from every existing contact.
 *
 * DELETE retries on transient failures by default. Re-deleting a field
 * that no longer exists is safe — the server treats it as success.
 */
export function createDeleteField(client: HttpClient) {
  return async (
    input: DeleteFieldInput,
    options?: RequestOptions
  ): Promise<FieldsSuccessResponse> => {
    const response = await client.request<FieldsSuccessResponse>({
      method: 'DELETE',
      path: '/v1/fields',
      body: input,
      ...(options ? { options } : {}),
    })
    return response.data
  }
}
