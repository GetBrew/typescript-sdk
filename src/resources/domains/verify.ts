import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Domain } from './types'

export type VerifyDomainInput = {
  domainId: string
}

/** Returns the bare `Domain` row with the refreshed status. */
export type VerifyDomainResponse = Domain

/**
 * `POST /v1/domains/{domainId}/verify` — re-check the DNS records with
 * the sending provider and refresh the row (empty body). Safe to poll —
 * keep calling until `sendable: true` (DNS propagation can take minutes
 * to hours). Returns the bare refreshed `Domain` row. Requires the
 * `domains` scope.
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
      method: 'POST',
      path: `/v1/domains/${encodeURIComponent(input.domainId)}/verify`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return verifyDomain
}
