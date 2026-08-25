import { type HttpClient, unwrapResponse } from '../../core/http'
import type { components } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Body for `POST /v1/sends` — the single, polymorphic send endpoint.
 * It is a union discriminated by `test`:
 *
 * - `{ test: true, emailId, subject, to, ... }` — a one-off TEST
 *   delivery to a single address. No verified domain or audience
 *   required; never creates a send row. Resolves synchronously (HTTP
 *   200) with `{ status: 'sent', recipient }`. Takes `variables`
 *   (merge-tag example values) and `payload` — nested JSON template
 *   data rendered via Liquid as `trigger.*` (scalar keys also resolve
 *   `{{ tag | fallback }}` merge tags), matching live-fire semantics.
 * - `{ emailId, subject, domainId, audienceId | to, ... }` — a real
 *   campaign send. Provide a recipient target (`audienceId` or inline
 *   `to`) and the verified `domainId` to send from. Accepted for
 *   queueing / scheduling (HTTP 202) with `{ status, sendId, runId }`.
 *
 * Event-triggered (transactional) mail is NOT sent here: wire the
 * design into a published automation on a transactional-purpose domain
 * and fire it with `brew.automations.triggers.fire<Payload>()`.
 */
/**
 * Distributes over the request union: variants that carry a `payload`
 * (test sends) get the typed payload; the rest are untouched. Pin a
 * trigger contract type (hand-written or from `brew-cli types`):
 *
 * ```ts
 * import type { OrderCompletedPayload } from './brew-contracts'
 * await brew.emails.send<OrderCompletedPayload>({
 *   test: true,
 *   emailId: 'eml_receipt',
 *   subject: 'Your receipt',
 *   to: 'a@b.co',
 *   payload: { total: 42 }, // type-checked against the contract
 * })
 * // live fire of the same payload shape:
 * // await brew.automations.triggers.fire<OrderCompletedPayload>({
 * //   triggerEventId: 'tri_…', payload: { total: 42 } })
 * ```
 */
type WithTypedPayload<T, TPayload> = T extends { payload?: unknown }
  ? Omit<T, 'payload'> & { payload?: TPayload }
  : T

/**
 * Un-pinned calls keep the exact wire value type (JSON-serializable only)
 * — the generic default must not loosen what the pre-generic input
 * rejected (functions, undefined values silently dropped by
 * JSON.stringify).
 */
type DefaultSendPayload = {
  [key: string]: components['schemas']['SendPayloadValue']
}

export type SendEmailInput<
  TPayload extends Record<string, unknown> = DefaultSendPayload,
> = WithTypedPayload<components['schemas']['SendEmailRequest'], TPayload>

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
  function sendEmail<
    TPayload extends Record<string, unknown> = DefaultSendPayload,
  >(
    input: SendEmailInput<TPayload>,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SendEmailResponse>>
  function sendEmail<
    TPayload extends Record<string, unknown> = DefaultSendPayload,
  >(
    input: SendEmailInput<TPayload>,
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
