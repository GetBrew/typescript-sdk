import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type {
  DomainUnsubscribesList,
  ListDomainUnsubscribesQuery,
} from './types'

/** The marketing domain whose list you are reading, plus the query knobs. */
export type ListDomainUnsubscribesInput = {
  /** A MARKETING sending domain; a transactional one owns no list. */
  readonly domainId: string
} & ListDomainUnsubscribesQuery

export type ListDomainUnsubscribesResponse = DomainUnsubscribesList

/**
 * `GET /v1/domains/{domainId}/unsubscribes` (scope: `domains`) — one page
 * of a MARKETING domain's unsubscribe list, newest first, under
 * `{ domainId, domainHost, data, pagination }`.
 *
 * Every marketing domain is its own list, keyed by the domain's host.
 * Each row carries `scope`: `domain` (on this host's list), `all` (the
 * brand-wide opt-out) or `both`. Narrow with `scope` (`domain` | `all` |
 * `any`, the default); search with `q` — an address (anything with `@`)
 * matches exactly once complete and by prefix while partial, other text
 * is a word search over the address and contact name. Page with `limit`
 * (1–100, default 100) and `cursor`.
 *
 * A transactional domain owns no list: `422 DOMAIN_PURPOSE_NOT_ALLOWED`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListDomainUnsubscribesResponse>` instead of the
 * unwrapped envelope.
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
    const { domainId, q, scope, limit, cursor } = input
    const response = await client.request<ListDomainUnsubscribesResponse>({
      method: 'GET',
      path: `/v1/domains/${encodeURIComponent(domainId)}/unsubscribes`,
      query: { q, scope, limit, cursor },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listDomainUnsubscribes
}
