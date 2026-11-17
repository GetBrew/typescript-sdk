import type { PaginationInput } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AppEmailsListResponse } from './types'

/** Pagination knobs accepted by `brew.appEmails.list(...)`. */
export type ListAppEmailsInput = PaginationInput

export type ListAppEmailsResponse = AppEmailsListResponse

/**
 * `GET /v1/app-emails` (scope: `automations`) — the brand's app emails
 * under `{ data, pagination }`: each keyed trigger an app-email setup
 * wired to a design and an automation, with its starter,
 * `upgradeAvailable`, `published`, `sender` and `readiness`. Page with
 * `limit` / `cursor`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListAppEmailsResponse>` instead of the unwrapped body.
 */
export function createListAppEmails(client: HttpClient) {
  function listAppEmails(
    input: ListAppEmailsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListAppEmailsResponse>>
  function listAppEmails(
    input?: ListAppEmailsInput,
    options?: RequestOptions
  ): Promise<ListAppEmailsResponse>
  async function listAppEmails(
    input: ListAppEmailsInput = {},
    options?: RequestOptions
  ): Promise<ListAppEmailsResponse | BrewRawResponse<ListAppEmailsResponse>> {
    const response = await client.request<ListAppEmailsResponse>({
      method: 'GET',
      path: '/v1/app-emails',
      query: {
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listAppEmails
}
