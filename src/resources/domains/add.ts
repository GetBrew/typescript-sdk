import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Domain } from './types'

export type AddDomainInput = components['schemas']['DomainsPostRequest']

export type AddDomainResponse = Domain

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
