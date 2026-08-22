import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { EmailGroupsListResponse, ListEmailGroupsInput } from './types'

export type { EmailGroupsListResponse, ListEmailGroupsInput }

/**
 * `GET /v1/email-groups` (scope: `emails`) — the single email-groups
 * read, under the uniform `{ data, pagination? }` envelope. Reads are
 * flat: identity lives in the query.
 *
 * - List mode (no `groupId`): every named folder for the brand, plus
 *   the `ungrouped` sentinel (`{ groupId: "ungrouped", groupName:
 *   "Ungrouped" }`), which is always included. `emailCount` is capped
 *   at 100. Page with `limit` / `cursor`.
 * - Detail mode (`groupId` set): a single-row page `{ data: [row] }`
 *   with no `pagination`; `404 EMAIL_GROUP_NOT_FOUND` on an unknown /
 *   cross-brand id.
 *
 * Filter designs inside a group with `brew.emails.list({ groupId })`.
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
