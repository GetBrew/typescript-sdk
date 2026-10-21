import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/** Add body — `{ name, region?, customReturnPath? }`. */
export type AddDomainInput = components['schemas']['DomainsPostRequest']

/**
 * The bare `Domain` row (status `pending` + DNS records), plus `warnings`
 * only with a caveat about the domain just added: `DKIM_SELECTOR_IN_USE`
 * when it already publishes a different DKIM key where Brew asks for its
 * record (`suggestedNames` lists subdomains to add instead).
 */
export type AddDomainResponse = components['schemas']['DomainsPostResponse']

/**
 * `POST /v1/domains` — register a sending domain. The returned bare
 * `Domain` row has `status: 'pending'` and the DNS `records` to publish;
 * once published, call `brew.domains.verify({ domainId })`. A
 * `DKIM_SELECTOR_IN_USE` warning means the domain is added but its DKIM
 * record would clash: add one of `suggestedNames` instead.
 * Requires the `domains` scope.
 */
export function createAddDomain(client: HttpClient) {
  function addDomain(
    input: AddDomainInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AddDomainResponse>>
  function addDomain(
    input: AddDomainInput,
    options?: RequestOptions
  ): Promise<AddDomainResponse>
  async function addDomain(
    input: AddDomainInput,
    options?: RequestOptions
  ): Promise<AddDomainResponse | BrewRawResponse<AddDomainResponse>> {
    const response = await client.request<AddDomainResponse>({
      method: 'POST',
      path: '/v1/domains',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return addDomain
}
