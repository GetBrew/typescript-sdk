import type { components } from '../../generated/openapi-types'
import type { HttpClient } from '../../core/http'

export type ListAudiencesResponse =
  components['schemas']['AudiencesListResponse']

/**
 * List saved audiences for the current organization.
 *
 * This returns the full envelope from the API. Audiences are already a
 * compact object shape, so keeping the wrapper leaves room for future
 * metadata without forcing a breaking SDK change later.
 */
export function createListAudiences(client: HttpClient) {
  return async (): Promise<ListAudiencesResponse> => {
    const response = await client.request<ListAudiencesResponse>({
      method: 'GET',
      path: '/v1/audiences',
    })
    return response.data
  }
}
