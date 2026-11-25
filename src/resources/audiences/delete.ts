import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type DeleteAudienceInput = {
  readonly audienceId: string
}
export type DeleteAudienceResponse =
  components['schemas']['AudiencesDeleteResponse']

export function createDeleteAudience(client: HttpClient) {
  function deleteAudience(
    input: DeleteAudienceInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<DeleteAudienceResponse>>
  function deleteAudience(
    input: DeleteAudienceInput,
    options?: RequestOptions
  ): Promise<DeleteAudienceResponse>
  async function deleteAudience(
    input: DeleteAudienceInput,
    options?: RequestOptions
  ): Promise<DeleteAudienceResponse | BrewRawResponse<DeleteAudienceResponse>> {
    const response = await client.request<DeleteAudienceResponse>({
      method: 'DELETE',
      path: `/v1/audiences/${encodeURIComponent(input.audienceId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteAudience
}
