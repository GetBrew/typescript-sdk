import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Send } from './types'

export type GetSendInput = {
  /**
   * The id of the send to fetch, as returned by `POST /v1/sends` and
   * listed by `GET /v1/sends`. Cross-brand or unknown ids surface as
   * `404 SEND_NOT_FOUND` from the server.
   */
  readonly sendId: string
}

/** Single-fetch returns the bare `Send` row (lifecycle status + `stats`), not an envelope. */
export type GetSendResponse = Send

/**
 * `GET /v1/sends/{sendId}` — return the bare send row: lifecycle status,
 * the design + pinned version it delivered, audience, timestamps, and
 * the aggregated `stats` block (or `404 SEND_NOT_FOUND` on a miss). Poll
 * this after `brew.sends.create(...)`. Requires the `sends` scope.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetSendResponse>` instead of the unwrapped payload.
 */
export function createGetSend(client: HttpClient) {
  function getSend(
    input: GetSendInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetSendResponse>>
  function getSend(
    input: GetSendInput,
    options?: RequestOptions
  ): Promise<GetSendResponse>
  async function getSend(
    input: GetSendInput,
    options?: RequestOptions
  ): Promise<GetSendResponse | BrewRawResponse<GetSendResponse>> {
    const response = await client.request<GetSendResponse>({
      method: 'GET',
      path: `/v1/sends/${encodeURIComponent(input.sendId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getSend
}
