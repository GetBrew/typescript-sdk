import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListEmailsInput = NonNullable<
  operations['listEmails']['parameters']['query']
>

export type ListEmailsResponse = components['schemas']['EmailsListResponse']

export function createListEmails(client: HttpClient) {
  function listEmails(
    input: ListEmailsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListEmailsResponse>>
  function listEmails(
    input?: ListEmailsInput,
    options?: RequestOptions
  ): Promise<ListEmailsResponse>
  async function listEmails(
    input: ListEmailsInput = {},
    options?: RequestOptions
  ): Promise<ListEmailsResponse | BrewRawResponse<ListEmailsResponse>> {
    const response = await client.request<ListEmailsResponse>({
      method: 'GET',
      path: '/v1/emails',
      query: {
        search: input.search,
        status: input.status,
        groupId: input.groupId,
        sortBy: input.sortBy,
        from: input.from,
        to: input.to,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listEmails
}
