import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AudienceWriteResult } from './types'

/**
 * PATCH body — at least one of `name`, `filters`, `addEmails` or
 * `removeEmails`. `addEmails` / `removeEmails` edit membership by address
 * instead of rewriting `filters` (pass one or the other, not both); an
 * edit the filters cannot express exactly is refused with
 * `409 AUDIENCE_MEMBERSHIP_NOT_EXPRESSIBLE`.
 */
export type UpdateAudienceBody = components['schemas']['AudiencesPatchRequest']

/** Update input — the `audienceId` (path) plus the fields to change. */
export type UpdateAudienceInput = {
  /** The id of the audience to update (path parameter). */
  readonly audienceId: string
} & UpdateAudienceBody

/**
 * Update returns the updated row, plus the `membership` report of an
 * address edit (what happened to each address) and
 * `emailListMaterializations` when a long list was stamped.
 */
export type UpdateAudienceResponse = AudienceWriteResult

/**
 * `PATCH /v1/audiences/{audienceId}` — update an audience's `name`,
 * its `filters`, or its members by address (`addEmails` /
 * `removeEmails`). Requires the `audiences` scope. Returns the updated
 * row, with a `membership` report for an address edit.
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
