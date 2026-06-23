import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Domain } from './types'

/** Add body — `{ name, region?, customReturnPath? }`. */
export type AddDomainInput = components['schemas']['DomainsPostRequest']

/** Returns the bare `Domain` row (status `pending` + DNS records). */
export type AddDomainResponse = Domain

/**
 * `POST /v1/domains` — register a sending domain. The returned bare
 * `Domain` row has `status: 'pending'` and the DNS `records` to publish;
 * once published, call `brew.domains.verify({ domainId })`.
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
