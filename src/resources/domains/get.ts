import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ListDomainsResponse } from './list'

export type GetDomainInput = {
  domainId: string
}

/** Single-fetch returns the same `{ domains: [row] }` one-element envelope. */
export type GetDomainResponse = ListDomainsResponse

/**
 * `GET /v1/domains?domainId=…` — return a single-element
 * `{ domains: [row] }` envelope (or `404 DOMAIN_NOT_FOUND`).
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
      path: '/v1/domains',
      query: { domainId: input.domainId },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getDomain
}
