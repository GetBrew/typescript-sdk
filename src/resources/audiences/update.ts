import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AudienceWriteResult } from './types'

export type UpdateAudienceBody = components['schemas']['AudiencesPatchRequest']

export type UpdateAudienceInput = {
  readonly audienceId: string
} & UpdateAudienceBody

export type UpdateAudienceResponse = AudienceWriteResult

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
