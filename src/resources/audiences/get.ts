import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ListAudiencesResponse } from './list'

export type GetAudienceInput = {
  audienceId: string
}

/** Single-fetch returns the same `{ audiences: [row] }` one-element envelope. */
export type GetAudienceResponse = ListAudiencesResponse

/**
 * `GET /v1/audiences?audienceId=…` — return a single-element
 * `{ audiences: [row] }` envelope (or `404 AUDIENCE_NOT_FOUND`).
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
      path: '/v1/audiences',
      query: { audienceId: input.audienceId },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAudience
}
