import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { FieldsGetResponse, ListFieldsInput } from './types'

export type { FieldsGetResponse, ListFieldsInput }

/** @deprecated Use {@link FieldsGetResponse}. */
export type ListFieldsResponse = FieldsGetResponse

/**
 * `GET /v1/fields` — list every contact field definition (both core
 * fields and organization-specific custom fields). Requires the
 * `contacts` scope.
 *
 * Returns the uniform `{ data, pagination }` envelope. Page with
 * `limit` (1–100, default 100) and the opaque `cursor` echoed from the
 * previous page's `pagination.cursor`.
 *
 * Pass `{ raw: true }` in the second argument to receive the full
 * `BrewRawResponse<FieldsGetResponse>` instead of the unwrapped
 * envelope.
 */
export function createListFields(client: HttpClient) {
  function listFields(
    input: ListFieldsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<FieldsGetResponse>>
  function listFields(
    input?: ListFieldsInput,
    options?: RequestOptions
  ): Promise<FieldsGetResponse>
  async function listFields(
    input: ListFieldsInput = {},
    options?: RequestOptions
  ): Promise<FieldsGetResponse | BrewRawResponse<FieldsGetResponse>> {
    const response = await client.request<FieldsGetResponse>({
      method: 'GET',
      path: '/v1/fields',
      query: {
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listFields
}
