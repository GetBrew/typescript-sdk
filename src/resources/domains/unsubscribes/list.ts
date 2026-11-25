import type { components, operations } from '../../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

export type ListDomainUnsubscribesInput = {
  readonly domainId: string
} & NonNullable<operations['listDomainUnsubscribes']['parameters']['query']>

export type ListDomainUnsubscribesResponse =
  components['schemas']['DomainUnsubscribesListResponse']

export function createListDomainUnsubscribes(client: HttpClient) {
  function listDomainUnsubscribes(
    input: ListDomainUnsubscribesInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListDomainUnsubscribesResponse>>
  function listDomainUnsubscribes(
    input: ListDomainUnsubscribesInput,
    options?: RequestOptions
  ): Promise<ListDomainUnsubscribesResponse>
  async function listDomainUnsubscribes(
    input: ListDomainUnsubscribesInput,
    options?: RequestOptions
  ): Promise<
    | ListDomainUnsubscribesResponse
    | BrewRawResponse<ListDomainUnsubscribesResponse>
  > {
    const response = await client.request<ListDomainUnsubscribesResponse>({
      method: 'GET',
      path: `/v1/domains/${encodeURIComponent(input.domainId)}/unsubscribes`,
      query: {
        q: input.q,
        scope: input.scope,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listDomainUnsubscribes
}
