import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Body of `POST /v1/emails/{emailId}/inbox-placement-tests`, plus the
 * `emailId` that goes on the URL.
 *
 * `domainId` is REQUIRED and must be a VERIFIED sending domain: the seeds are
 * mailed through your real send pipeline on that domain, so the result
 * reflects its actual deliverability and SPF/DKIM/DMARC.
 */
export type CreateInboxPlacementTestInput = {
  /** The design to test. Cross-brand or unknown ids surface as `404`. */
  readonly emailId: string
} & components['schemas']['EmailInboxPlacementRequest']

/**
 * 202 result of `POST /v1/emails/{emailId}/inbox-placement-tests` — the test
 * as created, with `status: 'collecting'` and `results: null`.
 */
export type InboxPlacementTest =
  components['schemas']['EmailInboxPlacementTest']

/** The lean list rows returned when `testId` is omitted on the read. */
export type InboxPlacementTestList =
  components['schemas']['EmailInboxPlacementTestList']

/**
 * Result of `GET /v1/emails/{emailId}/inbox-placement-tests`: ONE test when
 * `testId` is supplied, otherwise the design's recent tests.
 */
export type InboxPlacementGetResponse =
  components['schemas']['EmailInboxPlacementGetResponse']

/** Query for the read. Omit `testId` to list the design's recent tests. */
export type GetInboxPlacementResultsInput = {
  /** The design whose tests you are reading. */
  readonly emailId: string
  /** A specific test from `createInboxPlacementTest`. */
  readonly testId?: string
}

/**
 * `POST /v1/emails/{emailId}/inbox-placement-tests` (scope: `emails`) — test
 * where the design's latest version LANDS: inbox vs spam vs missing, across
 * real mailbox providers (Gmail, Outlook, Yahoo, Apple, and more).
 *
 * Brew provisions a seed list and sends the email to those addresses through
 * your REAL send pipeline on a verified `domainId`, so the verdict reflects
 * that domain's true reputation rather than a simulation.
 *
 * Returns `202` immediately with a `testId` and `status: 'collecting'`.
 * Results accrue over a few minutes: poll
 * {@link createGetInboxPlacementResults | `getInboxPlacementResults`} with
 * that `testId` until `status` is `completed`.
 *
 * This performs a real (small) send to the seeds IN ADDITION to the fixed
 * 10-credit fee (`X-Credit-Cost: 10`), charged only on a 2xx. An unverified
 * or cross-brand `domainId` surfaces as `422 DOMAIN_NOT_READY`. Supply
 * `options.idempotencyKey` to make retries safe; one is generated
 * automatically otherwise.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<InboxPlacementTest>` instead of the unwrapped payload.
 */
export function createCreateInboxPlacementTest(client: HttpClient) {
  function createInboxPlacementTest(
    input: CreateInboxPlacementTestInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<InboxPlacementTest>>
  function createInboxPlacementTest(
    input: CreateInboxPlacementTestInput,
    options?: RequestOptions
  ): Promise<InboxPlacementTest>
  async function createInboxPlacementTest(
    input: CreateInboxPlacementTestInput,
    options?: RequestOptions
  ): Promise<InboxPlacementTest | BrewRawResponse<InboxPlacementTest>> {
    const { emailId, ...body } = input
    const response = await client.request<InboxPlacementTest>({
      method: 'POST',
      path: `/v1/emails/${encodeURIComponent(emailId)}/inbox-placement-tests`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return createInboxPlacementTest
}

/**
 * `GET /v1/emails/{emailId}/inbox-placement-tests` (scope: `emails`) — read
 * inbox placement results. FREE.
 *
 * With `testId`: the current status and placement of ONE test. While `status`
 * is `collecting` this live-refreshes from the provider, so poll roughly every
 * 30 seconds until `status` is `completed`. A finished test carries
 * per-provider inbox/spam/missing tallies with folder and tab `categories`,
 * each provider's own SPF/DKIM/DMARC verdicts, Microsoft filter telemetry, a
 * spoofing check, header checks (one-click unsubscribe, plain-text part), a
 * content `spamFilter` verdict with the rules it triggered, and a `diagnosis`
 * array of findings with concrete remediation.
 *
 * Without `testId`: the design's recent tests as lean persisted rows, for
 * comparing subject, preview, and version variants side by side. Those rows
 * are snapshots, so poll a specific `testId` to refresh one.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<InboxPlacementGetResponse>` instead of the unwrapped
 * payload.
 */
export function createGetInboxPlacementResults(client: HttpClient) {
  function getInboxPlacementResults(
    input: GetInboxPlacementResultsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<InboxPlacementGetResponse>>
  function getInboxPlacementResults(
    input: GetInboxPlacementResultsInput,
    options?: RequestOptions
  ): Promise<InboxPlacementGetResponse>
  async function getInboxPlacementResults(
    input: GetInboxPlacementResultsInput,
    options?: RequestOptions
  ): Promise<
    InboxPlacementGetResponse | BrewRawResponse<InboxPlacementGetResponse>
  > {
    const { emailId, testId } = input
    const response = await client.request<InboxPlacementGetResponse>({
      method: 'GET',
      path: `/v1/emails/${encodeURIComponent(emailId)}/inbox-placement-tests`,
      ...(testId ? { query: { testId } } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getInboxPlacementResults
}
