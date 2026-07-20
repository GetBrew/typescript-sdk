import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * 200 result of `POST /v1/sends/{sendId}/resume` — the resumed send
 * (`{ sendId, status: 'sending' }`).
 */
export type SendResumeResponse = components['schemas']['SendResumeResponse']

/**
 * `POST /v1/sends/{sendId}/resume` (scope: `sends`) — resume a gradual send
 * that was paused with `sends.pause(...)`, picking the ramp back up where it
 * left off.
 *
 * Idempotent: a send that is already sending resolves `200` with the same
 * body. A send that is not in a resumable state (canceled, finished, or never
 * paused) surfaces as `409 SEND_NOT_RESUMABLE`. Brand-scoped, so an unknown
 * or cross-brand `sendId` is `404`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<SendResumeResponse>` instead of the unwrapped payload.
 */
export function createResume(client: HttpClient) {
  function resume(
    sendId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SendResumeResponse>>
  function resume(
    sendId: string,
    options?: RequestOptions
  ): Promise<SendResumeResponse>
  async function resume(
    sendId: string,
    options?: RequestOptions
  ): Promise<SendResumeResponse | BrewRawResponse<SendResumeResponse>> {
    const response = await client.request<SendResumeResponse>({
      method: 'POST',
      path: `/v1/sends/${encodeURIComponent(sendId)}/resume`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return resume
}
