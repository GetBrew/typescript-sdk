import type { components } from '../../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

export type AddDomainUnsubscribesInput = {
  readonly domainId: string
} & components['schemas']['DomainUnsubscribesAddRequest']

export type AddDomainUnsubscribesResponse =
  components['schemas']['DomainUnsubscribesAddResponse']

export function createAddDomainUnsubscribes(client: HttpClient) {
  function addDomainUnsubscribes(
    input: AddDomainUnsubscribesInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AddDomainUnsubscribesResponse>>
  function addDomainUnsubscribes(
    input: AddDomainUnsubscribesInput,
    options?: RequestOptions
  ): Promise<AddDomainUnsubscribesResponse>
  async function addDomainUnsubscribes(
    input: AddDomainUnsubscribesInput,
    options?: RequestOptions
  ): Promise<
    | AddDomainUnsubscribesResponse
    | BrewRawResponse<AddDomainUnsubscribesResponse>
  > {
    const response = await client.request<AddDomainUnsubscribesResponse>({
      method: 'POST',
      path: `/v1/domains/${encodeURIComponent(input.domainId)}/unsubscribes`,
      body: { emails: input.emails },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return addDomainUnsubscribes
}
