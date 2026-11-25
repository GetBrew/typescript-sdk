import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { DeleteEmailGroupInput, EmailGroupDeleteResponse } from './types'

export type { DeleteEmailGroupInput, EmailGroupDeleteResponse }

export function createDeleteEmailGroup(client: HttpClient) {
  function deleteEmailGroup(
    input: DeleteEmailGroupInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EmailGroupDeleteResponse>>
  function deleteEmailGroup(
    input: DeleteEmailGroupInput,
    options?: RequestOptions
  ): Promise<EmailGroupDeleteResponse>
  async function deleteEmailGroup(
    input: DeleteEmailGroupInput,
    options?: RequestOptions
  ): Promise<
    EmailGroupDeleteResponse | BrewRawResponse<EmailGroupDeleteResponse>
  > {
    const response = await client.request<EmailGroupDeleteResponse>({
      method: 'DELETE',
      path: `/v1/email-groups/${encodeURIComponent(input.groupId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteEmailGroup
}
