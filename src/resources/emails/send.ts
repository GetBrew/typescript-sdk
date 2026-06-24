import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Body for `POST /v1/sends` — the single, polymorphic send endpoint.
 * It is a union discriminated by `test`:
 *
 * - `{ test: true, emailId, subject, to, ... }` — a one-off TEST
 *   delivery to a single address. No verified domain or audience
 *   required; never creates a send row. Resolves synchronously (HTTP
 *   200) with `{ status: 'sent', recipient }`.
 * - `{ emailId, subject, domainId, audienceId | to, ... }` — a real
 *   campaign send. Provide a recipient target (`audienceId` or inline
 *   `to`) and the verified `domainId` to send from. Accepted for
 *   queueing / scheduling (HTTP 202) with `{ status, sendId, runId }`.
 */
export type SendEmailInput = components['schemas']['SendEmailRequest']

/** 200 result of a TEST send (`test: true`). */
export type SendEmailTestResponse =
  components['schemas']['SendEmailTestResponse']

/** 202 result of a queued / scheduled campaign send. */
export type SendEmailCampaignResponse =
  components['schemas']['SendsPostResponse']

/**
 * Union returned by `POST /v1/sends`: the TEST shape
 * (`{ status: 'sent', recipient }`) when `test: true`, otherwise the
 * campaign shape (`{ status: 'queued' | 'scheduled', sendId, runId }`).
 */
export type SendEmailResponse =
  | SendEmailTestResponse
  | SendEmailCampaignResponse

export type SendEmailStatus = SendEmailResponse['status']

/**
 * `POST /v1/sends` (scope: `sends`) — send a saved email design. This is
 * the single polymorphic send endpoint, discriminated by `test`:
 *
 * - Pass `{ test: true, ... }` for a one-off TEST delivery to a single
 *   `to` address. Forces the Brew default sender (no verified domain or
 *   audience required) and never creates a send row. Resolves
 *   synchronously (HTTP 200) with `{ status: 'sent', recipient }`.
 * - Otherwise it is a real campaign send: provide a recipient target
 *   (`audienceId` or inline `to`) and the verified `domainId`. A design
 *   can be sent unlimited times; every call mints a new send. This
 *   resolves when the API accepts the job (HTTP 202) — it does not wait
 *   for delivery. Poll `brew.analytics.sends.list({ sendId })` for
 *   lifecycle + stats.
 *
 * Supply `options.idempotencyKey` to make campaign retries safe.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<SendEmailResponse>` instead of the unwrapped
 * payload.
 */
export function createSendEmail(client: HttpClient) {
  function sendEmail(
    input: SendEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SendEmailResponse>>
  function sendEmail(
    input: SendEmailInput,
    options?: RequestOptions
  ): Promise<SendEmailResponse>
  async function sendEmail(
    input: SendEmailInput,
    options?: RequestOptions
  ): Promise<SendEmailResponse | BrewRawResponse<SendEmailResponse>> {
    const response = await client.request<SendEmailResponse>({
      method: 'POST',
      path: '/v1/sends',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return sendEmail
}
