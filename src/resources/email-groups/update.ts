import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { UpdateEmailGroupInput, UpdateEmailGroupResponse } from './types'

export type { UpdateEmailGroupInput, UpdateEmailGroupResponse }

export function createUpdateEmailGroup(client: HttpClient) {
  function updateEmailGroup(
    input: UpdateEmailGroupInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<UpdateEmailGroupResponse>>
  function updateEmailGroup(
    input: UpdateEmailGroupInput,
    options?: RequestOptions
  ): Promise<UpdateEmailGroupResponse>
  async function updateEmailGroup(
    input: UpdateEmailGroupInput,
    options?: RequestOptions
  ): Promise<
    UpdateEmailGroupResponse | BrewRawResponse<UpdateEmailGroupResponse>
  > {
    const { groupId, ...body } = input
    const response = await client.request<UpdateEmailGroupResponse>({
      method: 'PATCH',
      path: `/v1/email-groups/${encodeURIComponent(groupId)}`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return updateEmailGroup
}
