import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type {
  InboxPlacementTestList,
  ListInboxPlacementTestsQuery,
} from './types'

/** Query for the list read — the design plus pagination knobs. */
export type ListInboxPlacementTestsInput = {
  /** The design whose tests you are listing. */
  readonly emailId: string
} & ListInboxPlacementTestsQuery

export type ListInboxPlacementTestsResponse = InboxPlacementTestList

/**
 * `GET /v1/emails/{emailId}/inbox-placement-tests` (scope: `emails`) —
 * the design's recent tests as lean persisted rows, for comparing
 * subject, preview, and version variants side by side. FREE.
 *
 * Those rows are snapshots. To refresh one — or to read the full
 * per-provider breakdown, authentication verdicts, and `diagnosis` —
 * poll `brew.emails.inboxPlacementTests.get(emailId, testId)`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListInboxPlacementTestsResponse>` instead of the
 * unwrapped envelope.
 */
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
