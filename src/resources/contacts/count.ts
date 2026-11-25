import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContactsFilter } from './types'

export type CountContactsInput = {
  readonly search?: string
  readonly filters?: ReadonlyArray<ContactsFilter>
  readonly logic?: components['schemas']['ContactsSearchRequest']['logic']
  readonly audienceId?: components['schemas']['ContactsSearchRequest']['audienceId']
}

type ContactsCountResponse = components['schemas']['ContactsCountResponse']

export function createCountContacts(client: HttpClient) {
  function count(
    input: CountContactsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContactsCountResponse>>
  function count(
    input?: CountContactsInput,
    options?: RequestOptions
  ): Promise<number>
  async function count(
    input: CountContactsInput = {},
    options?: RequestOptions
  ): Promise<number | BrewRawResponse<ContactsCountResponse>> {
    const response = await client.request<ContactsCountResponse>({
      method: 'POST',
      path: '/v1/contacts/search',
      body: { ...input, count: true },
      ...(options ? { options } : {}),
    })
    if (options?.raw === true) {
      return unwrapResponse(
        response,
        options
      ) as BrewRawResponse<ContactsCountResponse>
    }
    return response.data.count
  }
  return count
}
