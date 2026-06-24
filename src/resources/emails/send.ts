import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/** Body for `POST /v1/sends` — start an async send of a saved design. */
export type SendsPostRequest = components['schemas']['SendsPostRequest']

/** 202 envelope for a queued/scheduled send. */
export type SendAcceptedResponse = components['schemas']['SendsPostResponse']
export type SendAcceptedStatus = SendAcceptedResponse['status']

/**
 * Send body for `POST /v1/sends`. A send delivers a saved email design to
 * a target — provide EXACTLY ONE recipient target: `audienceId` (a saved
 * audience) or `to` (a single inline address or an array, max 50). Test
 * deliveries live on their own endpoint — use `brew.emails.sendTest(...)`.
 */
export type SendEmailInput = SendsPostRequest
export type SendEmailResponse = SendAcceptedResponse

/**
 * `POST /v1/sends` — start an async send of an existing saved email
 * design. A design can be sent unlimited times; every call mints a new
 * send. Requires the `sends` scope.
 *
 * This resolves when the API accepts the job for queueing or scheduling
 * (HTTP 202). It does not wait for final delivery — poll
 * `brew.analytics.sends.get({ sendId })` for lifecycle + stats.
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
