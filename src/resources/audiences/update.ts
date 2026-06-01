import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ListAudiencesResponse } from './list'

/** Update body — `audienceId` + at least one of `name` / `filters`. */
export type UpdateAudienceInput = components['schemas']['AudiencesPatchRequest']

export type UpdateAudienceResponse = ListAudiencesResponse

/**
 * `PATCH /v1/audiences` — update an audience's `name` and/or `filters`.
 * Returns the uniform `{ audiences: [row] }` envelope.
 */
export function createUpdateAudience(client: HttpClient) {
  function updateAudience(
    input: UpdateAudienceInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<UpdateAudienceResponse>>
  function updateAudience(
    input: UpdateAudienceInput,
    options?: RequestOptions
  ): Promise<UpdateAudienceResponse>
  async function updateAudience(
    input: UpdateAudienceInput,
    options?: RequestOptions
  ): Promise<UpdateAudienceResponse | BrewRawResponse<UpdateAudienceResponse>> {
    const response = await client.request<UpdateAudienceResponse>({
      method: 'PATCH',
      path: '/v1/audiences',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return updateAudience
}
