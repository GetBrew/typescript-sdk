import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { CreateEmailGroupInput, CreateEmailGroupResponse } from './types'

export type { CreateEmailGroupInput, CreateEmailGroupResponse }

/**
 * `POST /v1/email-groups` (scope: `emails`) — create a named email
 * folder. Returns `201` with `{ groupId, groupName, emailCount: 0 }`.
 *
 * Reserved names (`Ungrouped` / `ungrouped` / `__ungrouped__`) are
 * `400`. Duplicate names are `409 EMAIL_GROUP_NAME_CONFLICT`. Pass the
 * returned `groupId` as `targetGroupId` on `emails.create` /
 * `emails.import` / `emails.clone` to file a design into this folder.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<CreateEmailGroupResponse>` instead of the unwrapped
 * row.
 */
export function createCreateEmailGroup(client: HttpClient) {
  function createEmailGroup(
    input: CreateEmailGroupInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CreateEmailGroupResponse>>
  function createEmailGroup(
    input: CreateEmailGroupInput,
    options?: RequestOptions
  ): Promise<CreateEmailGroupResponse>
  async function createEmailGroup(
    input: CreateEmailGroupInput,
    options?: RequestOptions
  ): Promise<
    CreateEmailGroupResponse | BrewRawResponse<CreateEmailGroupResponse>
  > {
    const response = await client.request<CreateEmailGroupResponse>({
      method: 'POST',
      path: '/v1/email-groups',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return createEmailGroup
}
