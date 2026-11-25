import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { CreateInboxPlacementTestBody, InboxPlacementTest } from './types'

export type CreateInboxPlacementTestInput = {
  readonly emailId: string
} & CreateInboxPlacementTestBody

export type CreateInboxPlacementTestResponse = InboxPlacementTest

export function createCreateInboxPlacementTest(client: HttpClient) {
  function createInboxPlacementTest(
    input: CreateInboxPlacementTestInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CreateInboxPlacementTestResponse>>
  function createInboxPlacementTest(
    input: CreateInboxPlacementTestInput,
    options?: RequestOptions
  ): Promise<CreateInboxPlacementTestResponse>
  async function createInboxPlacementTest(
    input: CreateInboxPlacementTestInput,
    options?: RequestOptions
  ): Promise<
    | CreateInboxPlacementTestResponse
    | BrewRawResponse<CreateInboxPlacementTestResponse>
  > {
    const { emailId, ...body } = input
    const response = await client.request<CreateInboxPlacementTestResponse>({
      method: 'POST',
      path: `/v1/emails/${encodeURIComponent(emailId)}/inbox-placement-tests`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return createInboxPlacementTest
}
