import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Audience } from './types'

export type GetAudienceInput = {
  /**
   * The id of the saved audience to fetch. Must belong to the brand the
   * API key is scoped to; cross-brand or unknown ids surface as
   * `404 AUDIENCE_NOT_FOUND`.
   */
  readonly audienceId: string
}

/** A single fetched audience row. */
export type GetAudienceResponse = Audience

/**
 * `GET /v1/audiences/{audienceId}` — return a single audience row (or
 * `404 AUDIENCE_NOT_FOUND`). Requires the `audiences` scope.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetAudienceResponse>` instead of the unwrapped row.
 */
export function createGetAudience(client: HttpClient) {
  function getAudience(
    input: GetAudienceInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetAudienceResponse>>
  function getAudience(
    input: GetAudienceInput,
    options?: RequestOptions
  ): Promise<GetAudienceResponse>
  async function getAudience(
    input: GetAudienceInput,
    options?: RequestOptions
  ): Promise<GetAudienceResponse | BrewRawResponse<GetAudienceResponse>> {
    const response = await client.request<GetAudienceResponse>({
      method: 'GET',
      path: `/v1/audiences/${encodeURIComponent(input.audienceId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAudience
}
