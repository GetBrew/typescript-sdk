import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type DeleteDomainInput = {
  domainId: string
}
export type DeleteDomainResponse =
  components['schemas']['DomainsDeleteResponse']

/**
 * `DELETE /v1/domains/{domainId}` — remove a domain from the provider +
 * local store. Idempotent: an unknown id resolves with
 * `{ deleted: false }`. Requires the `domains` scope.
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
      path: `/v1/domains/${encodeURIComponent(input.domainId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteDomain
}
