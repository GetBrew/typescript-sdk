import { autoPaginate } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  ListNotificationsInput,
  NotificationRow,
  NotificationsListResponse,
} from './types'

export type { ListNotificationsInput, NotificationsListResponse }

/**
 * `GET /v1/notifications` (no scope: any key) — the brand's notifications,
 * newest first, under `{ data, pagination }`, as the app's bell shows
 * them: generations, sends, imports, domain checks and score runs
 * finishing or failing, plus comment mentions and replies. Reading marks
 * nothing read. Free.
 *
 * Each row is shown only when its feature is within the key's scopes: a
 * `contacts` key sees import and validation rows, an `emails` key sees
 * chats, sends and domains; brand-wide rows (brand extraction, image
 * imports) need no scope. A comment mention or reply (`isPersonal: true`)
 * reaches only the person it is addressed to, so an API key never sees
 * one.
 *
 * Filter with `type`; page with `limit` (1–100, default 100) and `cursor`
 * (an opaque native cursor, up to 8,192 characters). A page can hold FEWER
 * rows than `limit` — even none — while `hasMore` is `true`, so follow
 * `pagination.hasMore`, never the row count; `brew.notifications.listAll`
 * does. An unknown query key or `type`, or a malformed cursor, is
 * `400 INVALID_REQUEST`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<NotificationsListResponse>` instead of the unwrapped
 * page.
 */
export function createListNotifications(client: HttpClient) {
  function listNotifications(
    input: ListNotificationsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<NotificationsListResponse>>
  function listNotifications(
    input?: ListNotificationsInput,
    options?: RequestOptions
  ): Promise<NotificationsListResponse>
  async function listNotifications(
    input: ListNotificationsInput = {},
    options?: RequestOptions
  ): Promise<
    NotificationsListResponse | BrewRawResponse<NotificationsListResponse>
  > {
    const response = await client.request<NotificationsListResponse>({
      method: 'GET',
      path: '/v1/notifications',
      query: {
        type: input.type,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listNotifications
}

/**
 * Input to `brew.notifications.listAll(...)`. Same filters as `list` minus
 * `cursor` — the iterator owns cursor state. `limit` is the per-page size,
 * not a total cap.
 */
export type ListAllNotificationsInput = Readonly<
  Omit<ListNotificationsInput, 'cursor'>
>

/**
 * Async iterator over every matching notification, newest first, yielding
 * one `NotificationRow` at a time. Follows `pagination.cursor` while
 * `hasMore` is `true` — through short and empty pages — and honors
 * `options.signal` between pages.
 *
 * ```ts
 * for await (const row of brew.notifications.listAll({
 *   type: 'email_send_failed',
 * })) {
 *   console.log(row.title, row.emailId)
 * }
 * ```
 */
export function createListAllNotifications(client: HttpClient) {
  const list = createListNotifications(client)

  return function listAllNotifications(
    input: ListAllNotificationsInput = {},
    options?: RequestOptions
  ): AsyncGenerator<NotificationRow, void, void> {
    return autoPaginate<NotificationRow>(
      async (cursor) => {
        const pageInput: ListNotificationsInput = {
          ...input,
          ...(cursor !== null ? { cursor } : {}),
        }
        const response = await list(pageInput, options)
        return { items: response.data, pagination: response.pagination }
      },
      options?.signal ? { signal: options.signal } : undefined
    )
  }
}
