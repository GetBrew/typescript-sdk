import type { HttpClient } from '../../core/http'

import type { ContactField } from './types'

export type ListFieldsResponse = {
  readonly fields: ReadonlyArray<ContactField>
}

/**
 * List every custom field defined on the contacts schema.
 *
 * Returns the full envelope (not just the array) so the API can grow
 * metadata like pagination or field counts later without a breaking
 * change on consumers. For now the envelope is just `{ fields }`.
 */
export function createListFields(client: HttpClient) {
  return async (): Promise<ListFieldsResponse> => {
    const response = await client.request<ListFieldsResponse>({
      method: 'GET',
      path: '/v1/fields',
    })
    return response.data
  }
}
