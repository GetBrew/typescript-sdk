import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { EmailGroupsListResponse, ListEmailGroupsInput } from './types'

export type { EmailGroupsListResponse, ListEmailGroupsInput }

/**
 * `GET /v1/email-groups` (scope: `emails`) — every named folder for the
 * brand, plus the `ungrouped` sentinel (`{ groupId: "ungrouped",
 * groupName: "Ungrouped" }`), which is always included, under the
 * uniform `{ data, pagination }` envelope. `emailCount` is capped at
 * 100. Page with `limit` / `cursor`.
 *
 * A single folder is `brew.emailGroups.get(groupId)` — there is no
 * `groupId` filter here any more. Filter the designs inside a group with
 * `brew.emails.list({ groupId })`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<EmailGroupsListResponse>` instead of the unwrapped
 * envelope.
 */
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
