import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListAudiencesResponse =
  components['schemas']['AudiencesListResponse']

/**
 * List saved audiences for the current organization.
 *
 * This returns the full envelope from the API. Audiences are already a
 * compact object shape, so keeping the wrapper leaves room for future
 * metadata without forcing a breaking SDK change later.
 *
 * Pass `{ raw: true }` in the second argument to receive the full
 * `BrewRawResponse<ListAudiencesResponse>` (including `status`,
 * `headers`, and `requestId`) instead of the unwrapped envelope.
 */
export function createListAudiences(client: HttpClient) {
  function listAudiences(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListAudiencesResponse>>
  function listAudiences(
    options?: RequestOptions
  ): Promise<ListAudiencesResponse>
  async function listAudiences(
    options?: RequestOptions
  ): Promise<ListAudiencesResponse | BrewRawResponse<ListAudiencesResponse>> {
    const response = await client.request<ListAudiencesResponse>({
      method: 'GET',
      path: '/v1/audiences',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listAudiences
}
