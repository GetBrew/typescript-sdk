import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { CreateEmailGroupInput, CreateEmailGroupResponse } from './types'

export type { CreateEmailGroupInput, CreateEmailGroupResponse }

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
