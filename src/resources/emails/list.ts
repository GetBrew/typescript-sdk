import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Query params accepted by `brew.emails.list(...)`. Sourced from the
 * generated `listEmails` query so any new knob upstream surfaces as a
 * compile error in the SDK.
 *
 * Filters: `status` (`generating | ready | failed`), `groupId`, the
 * `from` / `to` ISO-8601 window, and `sortBy` (`createdAt` |
 * `updatedAt`, default `updatedAt`). Page with `limit` / `cursor`.
 */
export type ListEmailsInput = NonNullable<
  operations['listEmails']['parameters']['query']
>

export type ListEmailsResponse = components['schemas']['EmailsListResponse']

/**
 * `GET /v1/emails` (scope: `emails`) — the latest version of each email
 * design, under the uniform `{ data, pagination }` envelope. Rows are
 * lean: no `html`, no `versions`.
 *
 * Filter with `status`, `groupId`, and the `from` / `to` window; choose
 * the ordering key with `sortBy` (`createdAt` | `updatedAt`); page with
 * `limit` / `cursor`. The old `createdAt*` / `updatedAt*` window params
 * collapsed into the single `from` / `to` pair.
 *
 * A single design is `brew.emails.get(emailId, { include: 'html' })` —
 * there is no `emailId` filter here any more.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListEmailsResponse>` instead of the unwrapped
 * envelope.
 */
export function createListEmails(client: HttpClient) {
  function listEmails(
    input: ListEmailsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListEmailsResponse>>
  function listEmails(
    input?: ListEmailsInput,
    options?: RequestOptions
  ): Promise<ListEmailsResponse>
  async function listEmails(
    input: ListEmailsInput = {},
    options?: RequestOptions
  ): Promise<ListEmailsResponse | BrewRawResponse<ListEmailsResponse>> {
    const response = await client.request<ListEmailsResponse>({
      method: 'GET',
      path: '/v1/emails',
      query: {
        status: input.status,
        groupId: input.groupId,
        sortBy: input.sortBy,
        from: input.from,
        to: input.to,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listEmails
}
