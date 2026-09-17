import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { CreateInboxPlacementTestBody, InboxPlacementTest } from './types'

/**
 * Body of `POST /v1/emails/{emailId}/inbox-placement-tests`, plus the
 * `emailId` that goes on the URL.
 *
 * `domainId` is REQUIRED and must be a VERIFIED sending domain: the
 * seeds are mailed through your real send pipeline on that domain, so
 * the result reflects its actual deliverability and SPF/DKIM/DMARC.
 */
export type CreateInboxPlacementTestInput = {
  /** The design to test. Cross-brand or unknown ids surface as `404`. */
  readonly emailId: string
} & CreateInboxPlacementTestBody

/**
 * 202 result — the test as created, `status: 'queued'` with
 * `results: null`.
 */
export type CreateInboxPlacementTestResponse = InboxPlacementTest

/**
 * `POST /v1/emails/{emailId}/inbox-placement-tests` (scope: `emails`) —
 * test where the design's latest version LANDS: inbox vs spam vs
 * missing, across real mailbox providers (Gmail, Outlook, Yahoo, Apple,
 * and more).
 *
 * Brew provisions a seed list and sends the email to those addresses
 * through your REAL send pipeline on a verified `domainId`, so the
 * verdict reflects that domain's true reputation rather than a
 * simulation.
 *
 * Returns `202` immediately with a `testId` and `status: 'queued'`.
 * Results accrue over a few minutes: poll
 * `brew.emails.inboxPlacementTests.get(emailId, testId)` until `status`
 * is `completed` (or `partially_completed` / `failed`).
 *
 * This performs a real (small) send to the seeds IN ADDITION to the
 * fixed 10-credit fee (`X-Credit-Cost: 10`), charged only on a 2xx. An
 * unverified or cross-brand `domainId` surfaces as
 * `422 DOMAIN_NOT_READY`. Supply `options.idempotencyKey` to make
 * retries safe; one is generated automatically otherwise.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<CreateInboxPlacementTestResponse>` instead of the
 * unwrapped payload.
 */
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
