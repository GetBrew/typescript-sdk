import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { SendsListResponse } from './types'

export type GetSendInput = {
  emailId: string
}

/** Single-fetch returns the same `{ sends: [row] }` one-element envelope (no `pagination`). */
export type GetSendResponse = SendsListResponse

/**
 * `GET /v1/sends?emailId=…` — return a single-element `{ sends: [row] }`
 * envelope for one email's send (or `404 SEND_NOT_FOUND` on a miss).
 * Requires the `sends` scope.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetSendResponse>` instead of the unwrapped envelope.
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
      path: '/v1/sends',
      query: { emailId: input.emailId },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getSend
}
