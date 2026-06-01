import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ListDomainsResponse } from './list'

export type VerifyDomainInput = {
  domainId: string
}

/** Returns the uniform `{ domains: [row] }` with the refreshed status. */
export type VerifyDomainResponse = ListDomainsResponse

/**
 * `PATCH /v1/domains { domainId, verify: true }` — re-check DNS with the
 * sending provider and persist the latest status / records. Returns
 * `422 DOMAIN_VERIFICATION_FAILED` while DNS is still propagating.
 */
export function createVerifyDomain(client: HttpClient) {
  function verifyDomain(
    input: VerifyDomainInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<VerifyDomainResponse>>
  function verifyDomain(
    input: VerifyDomainInput,
    options?: RequestOptions
  ): Promise<VerifyDomainResponse>
  async function verifyDomain(
    input: VerifyDomainInput,
    options?: RequestOptions
  ): Promise<VerifyDomainResponse | BrewRawResponse<VerifyDomainResponse>> {
    const response = await client.request<VerifyDomainResponse>({
      method: 'PATCH',
      path: '/v1/domains',
      body: { domainId: input.domainId, verify: true },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return verifyDomain
}
