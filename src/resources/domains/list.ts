import type { components } from '../../generated/openapi-types'
import type { PaginationInput } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListDomainsResponse = components['schemas']['DomainsListResponse']

/**
 * Input to `brew.domains.list(...)` — the single domains read. Reads are
 * flat: identity lives in the query.
 *
 * - Omit `domainId` to LIST every sending domain (including `pending`
 *   rows and their DNS `records`).
 * - Pass `domainId` to fetch ONE — the response is a single-row page
 *   `{ data: [row] }` (no `pagination`).
 * - `sendableOnly: true` narrows the list to verified, send-ready
 *   domains (the valid picker source for `brew.emails.send(...)` and
 *   automation `sendEmail` nodes).
 */
export type ListDomainsInput = PaginationInput & {
  /** Fetch one domain by id (detail mode → single-row page). Omit to list. */
  readonly domainId?: string
  /** List mode only — narrow to verified, send-ready domains. */
  readonly sendableOnly?: boolean
}

/**
 * `GET /v1/domains` (scope: `domains`) — the single domains read, under
 * the uniform `{ data, pagination? }` envelope. Reads are flat: the
 * identity lives in the query.
 *
 * - List mode (no `domainId`): every sending domain for the org —
 *   including `pending` rows and their DNS `records` — so lifecycle
 *   callers can complete verification. Each row carries `status` and the
 *   derived `sendable` flag. Pass `sendableOnly: true` to narrow to the
 *   verified, send-ready set; page with `limit` / `cursor`.
 * - Detail mode (`domainId` set): a single-row page `{ data: [row] }`
 *   with no `pagination`.
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
        domainId: input.domainId,
        sendableOnly: input.sendableOnly ? 'true' : undefined,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listDomains
}
