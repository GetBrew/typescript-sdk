import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewResponse, BrewRawResponse, RequestOptions } from '../../types'

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
    options?: RequestOptions<false>
  ): Promise<DuplicateAudienceResponse>
  function duplicateAudience(
    input: DuplicateAudienceInput,
    options?: RequestOptions
  ): Promise<BrewResponse<DuplicateAudienceResponse>>
  async function duplicateAudience(
    input: DuplicateAudienceInput,
    options?: RequestOptions
  ): Promise<BrewResponse<DuplicateAudienceResponse>> {
    const response = await client.request<DuplicateAudienceResponse>({
      method: 'POST',
      path: `/v1/audiences/${encodeURIComponent(input.audienceId)}/duplicate`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return duplicateAudience
}
