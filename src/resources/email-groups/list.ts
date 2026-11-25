import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { EmailGroupsListResponse, ListEmailGroupsInput } from './types'

export type { EmailGroupsListResponse, ListEmailGroupsInput }

export function createListEmailGroups(client: HttpClient) {
  function listEmailGroups(
    input: ListEmailGroupsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EmailGroupsListResponse>>
  function listEmailGroups(
    input?: ListEmailGroupsInput,
    options?: RequestOptions
  ): Promise<EmailGroupsListResponse>
  async function listEmailGroups(
    input: ListEmailGroupsInput = {},
    options?: RequestOptions
  ): Promise<
    EmailGroupsListResponse | BrewRawResponse<EmailGroupsListResponse>
  > {
    const response = await client.request<EmailGroupsListResponse>({
      method: 'GET',
      path: '/v1/email-groups',
      query: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listEmailGroups
}
