import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { InboxPlacementTest } from './types'

export type GetInboxPlacementTestResponse = InboxPlacementTest

export function createGetInboxPlacementTest(client: HttpClient) {
  function getInboxPlacementTest(
    emailId: string,
    testId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetInboxPlacementTestResponse>>
  function getInboxPlacementTest(
    emailId: string,
    testId: string,
    options?: RequestOptions
  ): Promise<GetInboxPlacementTestResponse>
  async function getInboxPlacementTest(
    emailId: string,
    testId: string,
    options?: RequestOptions
  ): Promise<
    | GetInboxPlacementTestResponse
    | BrewRawResponse<GetInboxPlacementTestResponse>
  > {
    const response = await client.request<GetInboxPlacementTestResponse>({
      method: 'GET',
      path: `/v1/emails/${encodeURIComponent(emailId)}/inbox-placement-tests/${encodeURIComponent(testId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getInboxPlacementTest
}
