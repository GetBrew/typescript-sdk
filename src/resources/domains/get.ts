import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Domain } from './types'

export type GetDomainInput = {
  domainId: string
}

/** Single-fetch returns the bare `Domain` row. */
export type GetDomainResponse = Domain

/**
 * `GET /v1/domains/{domainId}` — return the bare `Domain` row (`status`,
 * the derived `sendable` flag, and the full DNS `records` array) or
 * `404 DOMAIN_NOT_FOUND`. Requires the `domains` scope.
 */
export function createGetDomain(client: HttpClient) {
  function getDomain(
    input: GetDomainInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetDomainResponse>>
  function getDomain(
    input: GetDomainInput,
    options?: RequestOptions
  ): Promise<GetDomainResponse>
  async function getDomain(
    input: GetDomainInput,
    options?: RequestOptions
  ): Promise<GetDomainResponse | BrewRawResponse<GetDomainResponse>> {
    const response = await client.request<GetDomainResponse>({
      method: 'GET',
      path: `/v1/domains/${encodeURIComponent(input.domainId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getDomain
}
