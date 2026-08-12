import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type DuplicateAudienceInput = { readonly audienceId: string }
export type DuplicateAudienceResponse = components['schemas']['Audience']

/** `POST /v1/audiences/{audienceId}/duplicate` — exact saved-segment copy. */
export function createDuplicateAudience(client: HttpClient) {
  function duplicateAudience(
    input: DuplicateAudienceInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<DuplicateAudienceResponse>>
  function duplicateAudience(
    input: DuplicateAudienceInput,
    options?: RequestOptions
  ): Promise<DuplicateAudienceResponse>
  async function duplicateAudience(
    input: DuplicateAudienceInput,
    options?: RequestOptions
  ): Promise<
    DuplicateAudienceResponse | BrewRawResponse<DuplicateAudienceResponse>
  > {
    const response = await client.request<DuplicateAudienceResponse>({
      method: 'POST',
      path: `/v1/audiences/${encodeURIComponent(input.audienceId)}/duplicate`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return duplicateAudience
}
