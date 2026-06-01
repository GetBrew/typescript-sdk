import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListDomainsResponse = components['schemas']['DomainsListResponse']

/**
 * List ALL sending domains for the current organization — including
 * `pending` rows and their DNS `records` (so lifecycle callers can
 * complete verification). Each row carries `status` and the derived
 * `sendable` flag. For only the verified, send-ready set (the valid
 * picker source for `brew.sends.create(...)`), use
 * `brew.domains.listSendable()` or filter on `row.sendable`.
 *
 * Pass `{ raw: true }` in the second argument to receive the full
 * `BrewRawResponse<ListDomainsResponse>` instead of the unwrapped
 * envelope.
 */
export function createListDomains(client: HttpClient) {
  function listDomains(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListDomainsResponse>>
  function listDomains(options?: RequestOptions): Promise<ListDomainsResponse>
  async function listDomains(
    options?: RequestOptions
  ): Promise<ListDomainsResponse | BrewRawResponse<ListDomainsResponse>> {
    const response = await client.request<ListDomainsResponse>({
      method: 'GET',
      path: '/v1/domains',
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listDomains
}

/**
 * `GET /v1/domains?sendableOnly=true` — only verified, send-ready
 * domains (the valid picker source for sends + automation `sendEmail`
 * nodes).
 */
export function createListSendableDomains(client: HttpClient) {
  function listSendableDomains(
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListDomainsResponse>>
  function listSendableDomains(
    options?: RequestOptions
  ): Promise<ListDomainsResponse>
  async function listSendableDomains(
    options?: RequestOptions
  ): Promise<ListDomainsResponse | BrewRawResponse<ListDomainsResponse>> {
    const response = await client.request<ListDomainsResponse>({
      method: 'GET',
      path: '/v1/domains',
      query: { sendableOnly: 'true' },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listSendableDomains
}
