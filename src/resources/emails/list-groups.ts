import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListEmailGroupsInput = NonNullable<
  operations['listEmailGroups']['parameters']['query']
>
export type ListEmailGroupsResponse =
  components['schemas']['EmailGroupsListResponse']
export type EmailGroup = components['schemas']['EmailGroup']

/**
 * `GET /v1/email-groups` — saved groups in display order followed by the
 * virtual `ungrouped` group. Page with `limit` and `cursor`.
 */
export function createListEmailGroups(client: HttpClient) {
  function listEmailGroups(
    input: ListEmailGroupsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListEmailGroupsResponse>>
  function listEmailGroups(
    input?: ListEmailGroupsInput,
    options?: RequestOptions
  ): Promise<ListEmailGroupsResponse>
  async function listEmailGroups(
    input: ListEmailGroupsInput = {},
    options?: RequestOptions
  ): Promise<
    ListEmailGroupsResponse | BrewRawResponse<ListEmailGroupsResponse>
  > {
    const response = await client.request<ListEmailGroupsResponse>({
      method: 'GET',
      path: '/v1/email-groups',
      query: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listEmailGroups
}
