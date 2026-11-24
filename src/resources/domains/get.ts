import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewResponse, BrewRawResponse, RequestOptions } from '../../types'

import type { Domain } from './types'

/** `GET /v1/domains/{domainId}` returns the BARE `Domain` row. */
export type GetDomainResponse = Domain

/**
 * `GET /v1/domains/{domainId}` (scope: `domains`) — one sending domain,
 * returned as the BARE row: `status`, the derived `sendable` flag, the
 * sender defaults, and the full DNS `records` array.
 *
 * An unknown or cross-organization id is `404 DOMAIN_NOT_FOUND` — it is
 * no longer an empty page you have to test for.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetDomainResponse>` instead of the unwrapped row.
 */
export function createGetDomain(client: HttpClient) {
  function getDomain(
    domainId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetDomainResponse>>
  function getDomain(
    domainId: string,
    options?: RequestOptions<false>
  ): Promise<GetDomainResponse>
  function getDomain(
    domainId: string,
    options?: RequestOptions
  ): Promise<BrewResponse<GetDomainResponse>>
  async function getDomain(
    domainId: string,
    options?: RequestOptions
  ): Promise<BrewResponse<GetDomainResponse>> {
    const response = await client.request<GetDomainResponse>({
      method: 'GET',
      path: `/v1/domains/${encodeURIComponent(domainId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getDomain
}
