import type { operations } from '../../generated/openapi-types'

export type NotificationsListResponse =
  operations['listNotifications']['responses'][200]['content']['application/json']

export type NotificationRow = NotificationsListResponse['data'][number]

export type NotificationType = NotificationRow['type']

export type NotificationStatus = NotificationRow['status']

export type ListNotificationsInput = Readonly<
  NonNullable<operations['listNotifications']['parameters']['query']>
>
