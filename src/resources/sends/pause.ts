import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * 200 result of `POST /v1/sends/{sendId}/pause` — the paused send
 * (`{ sendId, status: 'paused' }`).
 */
export type SendPauseResponse = components['schemas']['SendPauseResponse']

/**
 * `POST /v1/sends/{sendId}/pause` (scope: `sends`) — pause an IN-FLIGHT
 * gradual send, halting the ramp without discarding it.
 *
 * This is the reversible stop: recipients already mailed stay mailed, the
 * remaining chunks simply stop going out until you call `sends.resume(...)`.
 * Reach for `sends.cancel(...)` instead when you want to end the send for
 * good.
 *
 * Idempotent: a send that is already `paused` resolves `200` with the same
 * body. A send that is not in a pausable state (already finished, canceled,
 * or never a gradual send) surfaces as `409 SEND_NOT_PAUSABLE`. Brand-scoped,
 * so an unknown or cross-brand `sendId` is `404`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<SendPauseResponse>` instead of the unwrapped payload.
 */
export function createPause(client: HttpClient) {
  function pause(
    sendId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SendPauseResponse>>
  function pause(
    sendId: string,
    options?: RequestOptions
  ): Promise<SendPauseResponse>
  async function pause(
    sendId: string,
    options?: RequestOptions
  ): Promise<SendPauseResponse | BrewRawResponse<SendPauseResponse>> {
    const response = await client.request<SendPauseResponse>({
      method: 'POST',
      path: `/v1/sends/${encodeURIComponent(sendId)}/pause`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return pause
}
