import type { components } from '../../generated/openapi-types'
import type { HttpClient } from '../../core/http'

export type ListDomainsResponse = components['schemas']['DomainsListResponse']

/**
 * List verified sending domains available to the current organization.
 *
 * The API already filters this down to domains that are actually usable
 * for public sends, so callers can safely treat the returned list as the
 * valid picker source for `brew.sends.create(...)`.
 */
export function createListDomains(client: HttpClient) {
  return async (): Promise<ListDomainsResponse> => {
    const response = await client.request<ListDomainsResponse>({
      method: 'GET',
      path: '/v1/domains',
    })
    return response.data
  }
}
