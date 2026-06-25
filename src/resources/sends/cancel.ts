import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * 200 result of `POST /v1/sends/{sendId}/cancel` — the canceled send
 * (`{ sendId, status: 'canceled' }`).
 */
export type SendCancelResponse = components['schemas']['SendCancelResponse']

/** The terminal `status` returned by a successful cancel (`'canceled'`). */
export type SendCancelStatus = SendCancelResponse['status']

/**
 * `POST /v1/sends/{sendId}/cancel` (scope: `sends`) — cancel a scheduled
 * or queued send before it goes out, returning the canceled send
 * (`{ sendId, status: 'canceled' }`).
 *
 * Idempotent: a send that is already `canceled` resolves `200` with the
 * same body. A send that has already started or finished (`sending`,
 * `sent`, or `failed`) surfaces as `409 SEND_NOT_CANCELLABLE`.
 * Brand-scoped — an unknown or cross-brand `sendId` is `404`.
 *
 * `sendId` is the id returned by `brew.emails.send(...)`
 * (`POST /v1/sends`). Supply `options.idempotencyKey` to make retries
 * safe; one is generated automatically otherwise.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<SendCancelResponse>` instead of the unwrapped
 * payload.
 */
export function createCancel(client: HttpClient) {
  function cancel(
    sendId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SendCancelResponse>>
  function cancel(
    sendId: string,
    options?: RequestOptions
  ): Promise<SendCancelResponse>
  async function cancel(
    sendId: string,
    options?: RequestOptions
  ): Promise<SendCancelResponse | BrewRawResponse<SendCancelResponse>> {
    const response = await client.request<SendCancelResponse>({
      method: 'POST',
      path: `/v1/sends/${encodeURIComponent(sendId)}/cancel`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return cancel
}
