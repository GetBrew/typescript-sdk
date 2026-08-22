import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Body for `POST /v1/sends` — the single, polymorphic send endpoint.
 * It is a union discriminated by `test` / `transactionId`:
 *
 * - `{ test: true, emailId, subject, to, ... }` — a one-off TEST
 *   delivery to a single address. No verified domain or audience
 *   required; never creates a send row. Resolves synchronously (HTTP
 *   200) with `{ status: 'sent', recipient }`. Takes `variables`
 *   (merge-tag example values) and `payload` — the same template data
 *   a live transactional fire takes, with live-fire semantics.
 * - `{ transactionId, to, payload?, strict? }` — fire a reusable
 *   transactional object. Domain and design are locked on the object;
 *   `payload` is nested JSON exposed to Liquid templates as
 *   `trigger.*` (scalar keys also resolve `{{ tag | fallback }}` merge
 *   tags). Nested values on a workspace without Liquid are rejected
 *   with `400 INVALID_REQUEST`. Discover the expected shape via
 *   `transactional.get(transactionId)` → `examplePayload`.
 * - `{ emailId, subject, domainId, audienceId | to, ... }` — a real
 *   campaign send. Provide a recipient target (`audienceId` or inline
 *   `to`) and the verified `domainId` to send from. Accepted for
 *   queueing / scheduling (HTTP 202) with `{ status, sendId, runId }`.
 */
/**
 * Distributes over the request union: variants that carry a `payload`
 * (test sends, transactional fires) get the typed payload; the rest are
 * untouched. Pin a transactional contract type (hand-written or from
 * `brew-cli types`):
 *
 * ```ts
 * import type { TxnReceiptPayload } from './brew-contracts'
 * await brew.emails.send<TxnReceiptPayload>({
 *   transactionId: 'txn_receipt',
 *   to: 'a@b.co',
 *   payload: { total: 42 }, // type-checked against the contract
 * })
 * ```
 */
type WithTypedPayload<T, TPayload> = T extends { payload?: unknown }
  ? Omit<T, 'payload'> & { payload?: TPayload }
  : T

export type SendEmailInput<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
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
    TPayload extends Record<string, unknown> = Record<string, unknown>,
  >(
    input: SendEmailInput<TPayload>,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SendEmailResponse>>
  function sendEmail<
    TPayload extends Record<string, unknown> = Record<string, unknown>,
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
