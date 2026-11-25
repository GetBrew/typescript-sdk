import type { HttpClient } from '../../core/http'

import { createListAllNotifications, createListNotifications } from './list'

export type NotificationsResource = {
  readonly list: ReturnType<typeof createListNotifications>
  readonly listAll: ReturnType<typeof createListAllNotifications>
}

export function createNotificationsResource(
  client: HttpClient
): NotificationsResource {
  return {
    list: createListNotifications(client),
    listAll: createListAllNotifications(client),
  }
}
