import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type {
  InboxPlacementTestList,
  ListInboxPlacementTestsQuery,
} from './types'

export type ListInboxPlacementTestsInput = {
  readonly emailId: string
} & ListInboxPlacementTestsQuery

export type ListInboxPlacementTestsResponse = InboxPlacementTestList

export function createListInboxPlacementTests(client: HttpClient) {
  function listInboxPlacementTests(
    input: ListInboxPlacementTestsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListInboxPlacementTestsResponse>>
  function listInboxPlacementTests(
    input: ListInboxPlacementTestsInput,
    options?: RequestOptions
  ): Promise<ListInboxPlacementTestsResponse>
  async function listInboxPlacementTests(
    input: ListInboxPlacementTestsInput,
    options?: RequestOptions
  ): Promise<
    | ListInboxPlacementTestsResponse
    | BrewRawResponse<ListInboxPlacementTestsResponse>
  > {
    const { emailId, limit, cursor } = input
    const response = await client.request<ListInboxPlacementTestsResponse>({
      method: 'GET',
      path: `/v1/emails/${encodeURIComponent(emailId)}/inbox-placement-tests`,
      query: { limit, cursor },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listInboxPlacementTests
}
