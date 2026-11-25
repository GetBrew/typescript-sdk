import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Domain } from './types'

export type VerifyDomainInput = {
  domainId: string
}

export type VerifyDomainResponse = Domain

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
