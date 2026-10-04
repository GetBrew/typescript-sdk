import type { HttpClient } from '../../core/http'

import { createListAllNotifications, createListNotifications } from './list'

export type NotificationsResource = {
  /** `GET /v1/notifications` — the brand's notifications, newest first, as the app's bell shows them; filter by `type`. Each row needs its feature's scope; a page can be short while `hasMore` is `true` (any key). */
  readonly list: ReturnType<typeof createListNotifications>
  /** Auto-pager over `list` — yields every matching `NotificationRow`, through short pages. */
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
