import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListDomainsResponse = components['schemas']['DomainsListResponse']

/**
 * List verified sending domains available to the current organization.
 *
 * The API already filters this down to domains that are actually usable
 * for public sends, so callers can safely treat the returned list as the
 * valid picker source for `brew.sends.create(...)`.
 *
 * Pass `{ raw: true }` in the second argument to receive the full
 * `BrewRawResponse<ListDomainsResponse>` instead of the unwrapped
 * envelope.
 */
export function createListDomains(client: HttpClient) {
  function listDomains(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListDomainsResponse>>
  function listDomains(options?: RequestOptions): Promise<ListDomainsResponse>
  async function listDomains(
    options?: RequestOptions
  ): Promise<ListDomainsResponse | BrewRawResponse<ListDomainsResponse>> {
    const response = await client.request<ListDomainsResponse>({
      method: 'GET',
      path: '/v1/domains',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listDomains
}
