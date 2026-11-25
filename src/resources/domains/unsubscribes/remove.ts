import type { components } from '../../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

export type RemoveDomainUnsubscribeInput = {
  readonly domainId: string
  readonly email: string
}

export type RemoveDomainUnsubscribeResponse =
  components['schemas']['DomainUnsubscribeRemoveResponse']

export function createRemoveDomainUnsubscribe(client: HttpClient) {
  function removeDomainUnsubscribe(
    input: RemoveDomainUnsubscribeInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<RemoveDomainUnsubscribeResponse>>
  function removeDomainUnsubscribe(
    input: RemoveDomainUnsubscribeInput,
    options?: RequestOptions
  ): Promise<RemoveDomainUnsubscribeResponse>
  async function removeDomainUnsubscribe(
    input: RemoveDomainUnsubscribeInput,
    options?: RequestOptions
  ): Promise<
    | RemoveDomainUnsubscribeResponse
    | BrewRawResponse<RemoveDomainUnsubscribeResponse>
  > {
    const response = await client.request<RemoveDomainUnsubscribeResponse>({
      method: 'DELETE',
      path: `/v1/domains/${encodeURIComponent(input.domainId)}/unsubscribes/${encodeURIComponent(input.email)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return removeDomainUnsubscribe
}
