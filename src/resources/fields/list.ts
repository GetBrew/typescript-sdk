import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { FieldsGetResponse, ListFieldsInput } from './types'

export type { FieldsGetResponse, ListFieldsInput }

/** @deprecated */
export type ListFieldsResponse = FieldsGetResponse

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
        include: input.include,
        audienceId: input.audienceId,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listFields
}
