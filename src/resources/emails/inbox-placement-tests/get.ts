import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { InboxPlacementTest } from './types'

/**
 * `GET /v1/emails/{emailId}/inbox-placement-tests/{testId}` returns the
 * BARE test.
 */
export type GetInboxPlacementTestResponse = InboxPlacementTest

/**
 * `GET /v1/emails/{emailId}/inbox-placement-tests/{testId}` (scope:
 * `emails`) — the current status and placement of ONE test, returned as
 * the BARE row. FREE.
 *
 * While the test is still running this live-refreshes from the provider,
 * so poll roughly every 30 seconds until `status` is `completed` (or
 * `partially_completed` / `failed`). A finished test carries
 * per-provider inbox/spam/missing tallies with folder and tab
 * `categories`, each provider's own SPF/DKIM/DMARC verdicts, Microsoft
 * filter telemetry, a spoofing check, header checks (one-click
 * unsubscribe, plain-text part), a content `spamFilter` verdict with the
 * rules it triggered, and a `diagnosis` array of findings with concrete
 * remediation.
 *
 * This is a real route now — the old `?testId=` filter on the list read
 * is gone.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetInboxPlacementTestResponse>` instead of the
 * unwrapped row.
 */
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
