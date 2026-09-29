import type { components, operations } from '../../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

/** Input to `brew.domains.unsubscribes.list(...)`. */
export type ListDomainUnsubscribesInput = {
  readonly domainId: string
} & NonNullable<operations['listDomainUnsubscribes']['parameters']['query']>

export type ListDomainUnsubscribesResponse =
  components['schemas']['DomainUnsubscribesListResponse']

/**
 * `GET /v1/domains/{domainId}/unsubscribes` (scope: `domains`) — one page of
 * a marketing domain's unsubscribe list, newest first, under the uniform
 * `{ data, pagination }` envelope. Each row's `scope` says whether the
 * address is on this domain's list (`domain`), opted out brand-wide (`all`)
 * or both; `scope` narrows and `q` searches by address. A transactional
 * domain owns no list (`422 DOMAIN_PURPOSE_NOT_ALLOWED`).
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListDomainUnsubscribesResponse>`.
 */
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
