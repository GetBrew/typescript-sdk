import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListDomainsResponse = components['schemas']['DomainsListResponse']

/**
 * Input to `brew.domains.list(...)`.
 *
 * - `sendableOnly: true` narrows to verified, send-ready domains (the
 *   valid picker source for `brew.emails.send(...)` and automation
 *   `sendEmail` nodes).
 * - `sendingPurpose` narrows to domains cleared for `marketing` or
 *   `transactional` mail.
 */
export type ListDomainsInput = Omit<
  NonNullable<operations['listDomains']['parameters']['query']>,
  'sendableOnly'
> & {
  /** Narrow to verified, send-ready domains. */
  readonly sendableOnly?: boolean
}

/**
 * `GET /v1/domains` (scope: `domains`) — every sending domain for the
 * organization, under the uniform `{ data, pagination }` envelope —
 * including `pending` rows and their DNS `records`, so lifecycle callers
 * can complete verification. Each row carries `status` and the derived
 * `sendable` flag.
 *
 * Narrow with `sendableOnly: true` and/or `sendingPurpose`; page with
 * `limit` / `cursor`. A single domain is `brew.domains.get(domainId)` —
 * there is no `domainId` filter here any more.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListDomainsResponse>` instead of the unwrapped
 * envelope.
 */
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
