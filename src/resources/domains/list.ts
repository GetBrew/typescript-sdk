import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListDomainsResponse = components['schemas']['DomainsListResponse']

export type ListDomainsInput = Omit<
  NonNullable<operations['listDomains']['parameters']['query']>,
  'sendableOnly'
> & {
  readonly sendableOnly?: boolean
}

export function createListDomains(client: HttpClient) {
  function listDomains(
    input: ListDomainsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListDomainsResponse>>
  function listDomains(
    input?: ListDomainsInput,
    options?: RequestOptions
  ): Promise<ListDomainsResponse>
  async function listDomains(
    input: ListDomainsInput = {},
    options?: RequestOptions
  ): Promise<ListDomainsResponse | BrewRawResponse<ListDomainsResponse>> {
    const response = await client.request<ListDomainsResponse>({
      method: 'GET',
      path: '/v1/domains',
      query: {
        sendableOnly: input.sendableOnly ? 'true' : undefined,
        sendingPurpose: input.sendingPurpose,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listDomains
}
