import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContactField } from './types'

/** `GET /v1/fields/{fieldName}` returns the BARE field definition. */
export type GetFieldResponse = ContactField

/**
 * `GET /v1/fields/{fieldName}` (scope: `contacts`) — one contact field
 * definition (a core column or an organization custom field), returned
 * as the BARE row.
 *
 * An unknown field is `404 FIELD_NOT_FOUND` — you no longer have to scan
 * the list page for it.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetFieldResponse>` instead of the unwrapped row.
 */
export function createGetField(client: HttpClient) {
  function getField(
    fieldName: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetFieldResponse>>
  function getField(
    fieldName: string,
    options?: RequestOptions
  ): Promise<GetFieldResponse>
  async function getField(
    fieldName: string,
    options?: RequestOptions
  ): Promise<GetFieldResponse | BrewRawResponse<GetFieldResponse>> {
    const response = await client.request<GetFieldResponse>({
      method: 'GET',
      path: `/v1/fields/${encodeURIComponent(fieldName)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getField
}
