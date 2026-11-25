import { autoPaginate, pageReadOptions } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  ListNotificationsInput,
  NotificationRow,
  NotificationsListResponse,
} from './types'

export type { ListNotificationsInput, NotificationsListResponse }

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

export type ListAllNotificationsInput = Readonly<
  Omit<ListNotificationsInput, 'cursor'>
>

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
        const response = await list(pageInput, pageReadOptions({ options }))
        return { items: response.data, pagination: response.pagination }
      },
      options?.signal ? { signal: options.signal } : undefined
    )
  }
}
