import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContactField } from './types'

export type GetFieldResponse = ContactField

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
