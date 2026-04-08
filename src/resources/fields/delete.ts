import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

import type { FieldsSuccessResponse } from './types'

export type DeleteFieldInput = {
  readonly fieldName: string
}

/**
 * Remove a custom field from the contacts schema.
 *
 * Deleting a field is destructive — it drops the column from every
 * existing contact — so the transport's safe-retry policy (GET/DELETE
 * retry by default) is actually fine here: the delete is idempotent at
 * the server-state level (a second delete of a missing field just
 * returns success), and retrying on a transient network failure is
 * preferable to leaving the caller guessing whether the field is gone.
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
