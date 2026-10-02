import type { operations } from '../../generated/openapi-types'

/**
 * The page `GET /v1/notifications` returns (`brew.notifications.list()`):
 * the brand's notifications, newest first, under `{ data, pagination }`.
 * Derived from the generated `listNotifications` operation so a rename of
 * the response component cannot break it.
 */
export type NotificationsListResponse =
  operations['listNotifications']['responses'][200]['content']['application/json']

/**
 * One notification as the app's bell shows it: `type`, `status`, `title`,
 * `subtitle`, an optional `progressPercent`, a `url` into the app, the ids
 * it concerns (`chatId`, `emailId`, `domainId`, `domainName`),
 * `isPersonal` and its timestamps. Its id (`ntf_…`) is stable for the
 * row's life.
 *
 * Named `NotificationRow` rather than `Notification` so it never shadows
 * the DOM's global `Notification` (as `EventRow` avoids `Event`).
 */
export type NotificationRow = NotificationsListResponse['data'][number]

/** What a notification is about — also the `type` filter's values. */
export type NotificationType = NotificationRow['type']

/** Where the work a notification reports stands (`completed`, `failed`, …). */
export type NotificationStatus = NotificationRow['status']

/**
 * The generated query `GET /v1/notifications` takes: `type` (one
 * notification type), `limit` and `cursor`.
 */
export type ListNotificationsInput = Readonly<
  NonNullable<operations['listNotifications']['parameters']['query']>
>
