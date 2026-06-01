import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type DeleteDomainInput = components['schemas']['DomainsDeleteRequest']
export type DeleteDomainResponse =
  components['schemas']['DomainsDeleteResponse']

/**
 * `DELETE /v1/domains` — remove a domain from the provider + local
 * store. Idempotent: an unknown id resolves with `{ deleted: false }`.
 */
export function createDeleteDomain(client: HttpClient) {
  function deleteDomain(
    input: DeleteDomainInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<DeleteDomainResponse>>
  function deleteDomain(
    input: DeleteDomainInput,
    options?: RequestOptions
  ): Promise<DeleteDomainResponse>
  async function deleteDomain(
    input: DeleteDomainInput,
    options?: RequestOptions
  ): Promise<DeleteDomainResponse | BrewRawResponse<DeleteDomainResponse>> {
    const response = await client.request<DeleteDomainResponse>({
      method: 'DELETE',
      path: '/v1/domains',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteDomain
}
