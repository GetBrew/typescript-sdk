import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { EmailGroup } from './types'

export type GetEmailGroupResponse = EmailGroup

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
