import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Audience } from './types'

/** PATCH body — at least one of `name` / `filters`. */
export type UpdateAudienceBody = components['schemas']['AudiencesPatchRequest']

/** Update input — the `audienceId` (path) plus the fields to change. */
export type UpdateAudienceInput = {
  /** The id of the audience to update (path parameter). */
  readonly audienceId: string
} & UpdateAudienceBody

/** Update returns the updated `Audience` row. */
export type UpdateAudienceResponse = Audience

/**
 * `PATCH /v1/audiences/{audienceId}` — update an audience's `name`
 * and/or `filters`. Requires the `audiences` scope. Returns the updated
 * `Audience` row.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<UpdateAudienceResponse>` instead of the unwrapped row.
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
    const { audienceId, ...body } = input
    const response = await client.request<UpdateAudienceResponse>({
      method: 'PATCH',
      path: `/v1/audiences/${encodeURIComponent(audienceId)}`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return updateAudience
}
