import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { EmailGroup } from './types'

/** `GET /v1/email-groups/{groupId}` returns the BARE folder row. */
export type GetEmailGroupResponse = EmailGroup

/**
 * `GET /v1/email-groups/{groupId}` (scope: `emails`) — one email folder,
 * returned as the BARE row (`groupId`, `groupName`, and the live
 * `emailCount`, capped at 100).
 *
 * An unknown or cross-brand id is `404 EMAIL_GROUP_NOT_FOUND` — it is no
 * longer an empty page you have to test for. List the designs inside a
 * folder with `brew.emails.list({ groupId })`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetEmailGroupResponse>` instead of the unwrapped row.
 */
export function createGetEmailGroup(client: HttpClient) {
  function getEmailGroup(
    groupId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetEmailGroupResponse>>
  function getEmailGroup(
    groupId: string,
    options?: RequestOptions
  ): Promise<GetEmailGroupResponse>
  async function getEmailGroup(
    groupId: string,
    options?: RequestOptions
  ): Promise<GetEmailGroupResponse | BrewRawResponse<GetEmailGroupResponse>> {
    const response = await client.request<GetEmailGroupResponse>({
      method: 'GET',
      path: `/v1/email-groups/${encodeURIComponent(groupId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getEmailGroup
}
