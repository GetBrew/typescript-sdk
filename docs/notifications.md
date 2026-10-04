# `brew.notifications`

The brand's notifications as the app's bell shows them: generations,
sends, imports, domain checks and score runs finishing or failing. Free and
read-only. Reading marks nothing read.

| Method                | HTTP                            | Scope |
| --------------------- | ------------------------------- | ----- |
| [`list`](#list)       | `GET /v1/notifications`         | any   |
| [`listAll`](#listall) | `GET /v1/notifications` (paged) | any   |

> **New in 11.6.0.** The typed replacement for reading notifications through
> `brew.data.run`, which the API is retiring.

## Shared types

```ts
type NotificationRow = {
  readonly notificationId: string // `ntf_…`, stable for the row's life
  readonly type: NotificationType // 'email_sent', 'import_job', 'domain_score_run', …
  readonly status: NotificationStatus // 'processing', 'completed', 'failed', …
  readonly title: string
  readonly subtitle: string
  readonly progressPercent?: number // 0–100 while work that reports progress runs
  readonly url?: string // where the bell opens it in Brew
  readonly chatId?: string
  readonly emailId?: string
  readonly domainId?: string
  readonly domainName?: string
  readonly isPersonal: boolean
  readonly createdAt: string // ISO-8601
  readonly updatedAt: string
  readonly completedAt?: string
}
```

The type is `NotificationRow`, not `Notification`, so it never shadows the
DOM's global `Notification`.

### What a key sees

The route needs no scope, but each row is shown only when the key may read
its feature. **An empty page can mean nothing happened, or that this key
cannot see that kind of row.** A `type` the key cannot see is an empty
page, not an error.

| Types                                                                                                                         | Who sees them                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `chat_stream`, `preview_email`                                                                                                | the `emails` scope                                                                   |
| `email_sent`, `email_scheduled`, `email_send_failed`, `gradual_send_paused`, `gradual_send_completed`, `send_review_rejected` | `sends` (`emails` implies it)                                                        |
| `domain_status`, `domain_score_run`                                                                                           | `domains` (`emails` implies it)                                                      |
| `import_job`, `validation_job`                                                                                                | `contacts`                                                                           |
| `automation_pause_window_closed`                                                                                              | `automations`                                                                        |
| `brand_extracted`, `brand_image_import`                                                                                       | every key on the brand                                                               |
| `api_key_created`                                                                                                             | the `all` scope                                                                      |
| `send_limit_reached`                                                                                                          | organization admins only (an organization-wide key holding `all`), never a brand key |
| `comment_mention`, `comment_reply` (`isPersonal: true`)                                                                       | only the person addressed, never an API key                                          |

---

## `list`

One page, newest first, under `{ data, pagination }`.

```ts
type ListNotificationsInput = {
  readonly type?: NotificationType // one notification type
  readonly limit?: number // 1–100, default 100
  readonly cursor?: string
}
```

```ts
const { data, pagination } = await brew.notifications.list({
  type: 'email_send_failed',
})
for (const row of data) {
  console.log(row.title, row.subtitle, row.url)
}
```

**A page can hold fewer rows than `limit`, even none, while
`pagination.hasMore` is `true`.** The server scans a bounded window per
page and filters out rows the key cannot see. Follow `hasMore` and
`cursor`, never the row count, or use [`listAll`](#listall).

The `cursor` is an opaque native cursor of up to 8,192 characters. Pass it
back unchanged.

### Errors

- **`400 INVALID_REQUEST`**: an unknown query key or `type`, or a malformed
  cursor.

## `listAll`

Async iterator over every matching notification, newest first. Same input
as `list` minus `cursor`. It keeps paging through short and empty pages
while `hasMore` is `true`, and stops fetching when `options.signal` aborts.

```ts
for await (const row of brew.notifications.listAll({ type: 'import_job' })) {
  console.log(row.status, row.title)
}
```

Pass `{ raw: true }` in `options` on `list` to receive the full
`BrewRawResponse<T>` (status, headers, request id) instead of the
unwrapped page.
