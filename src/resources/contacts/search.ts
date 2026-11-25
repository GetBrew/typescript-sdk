import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContactsFilter } from './types'

type ContactsSearchRequest = components['schemas']['ContactsSearchRequest']

export type SearchContactsInput = {
  readonly search?: ContactsSearchRequest['search']
  readonly filters?: ReadonlyArray<ContactsFilter>
  readonly audienceId?: ContactsSearchRequest['audienceId']
  readonly logic?: ContactsSearchRequest['logic']
  readonly sort?: ContactsSearchRequest['sort']
  readonly order?: ContactsSearchRequest['order']
  readonly limit?: ContactsSearchRequest['limit']
  readonly cursor?: ContactsSearchRequest['cursor']
  readonly include?: ReadonlyArray<
    NonNullable<ContactsSearchRequest['include']>[number]
  >
}

type SearchContactsPage = Extract<
  operations['searchContacts']['responses'][200]['content']['application/json'],
  { readonly data: unknown }
>

type PageWithOpenProfile<Page> = Page extends {
  readonly data: ReadonlyArray<infer Row>
}
  ? 'openProfile' extends keyof Row
    ? Page
    : never
  : never

export type SearchContactsResponse = PageWithOpenProfile<SearchContactsPage>

export type ContactSearchRow = SearchContactsResponse['data'][number]

export function createSearchContacts(client: HttpClient) {
  function search(
    input: SearchContactsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SearchContactsResponse>>
  function search(
    input?: SearchContactsInput,
    options?: RequestOptions
  ): Promise<SearchContactsResponse>
  async function search(
    input: SearchContactsInput = {},
    options?: RequestOptions
  ): Promise<SearchContactsResponse | BrewRawResponse<SearchContactsResponse>> {
    const { include, ...rest } = input
    const response = await client.request<SearchContactsResponse>({
      method: 'POST',
      path: '/v1/contacts/search',
      body: {
        ...rest,
        ...(include !== undefined && include.length > 0 ? { include } : {}),
        count: false,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return search
}
