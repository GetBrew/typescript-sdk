import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Domain } from './types'

export type GetDomainResponse = Domain

export function createGetDomain(client: HttpClient) {
  function getDomain(
    domainId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetDomainResponse>>
  function getDomain(
    domainId: string,
    options?: RequestOptions
  ): Promise<GetDomainResponse>
  async function getDomain(
    domainId: string,
    options?: RequestOptions
  ): Promise<GetDomainResponse | BrewRawResponse<GetDomainResponse>> {
    const response = await client.request<GetDomainResponse>({
      method: 'GET',
      path: `/v1/domains/${encodeURIComponent(domainId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getDomain
}
