import type { components } from '../../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

/** Input to `brew.domains.unsubscribes.remove(...)`. */
export type RemoveDomainUnsubscribeInput = {
  readonly domainId: string
  readonly email: string
}

export type RemoveDomainUnsubscribeResponse =
  components['schemas']['DomainUnsubscribeRemoveResponse']

/**
 * `DELETE /v1/domains/{domainId}/unsubscribes/{email}` (scope: `domains`) —
 * take one address off this domain's list. It never re-subscribes a
 * brand-wide opt-out.
 */
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
