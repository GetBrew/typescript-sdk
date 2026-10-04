# `brew.chats`

The brand's Brew chats: find one with `list`, then resume it in your own
agent with `get`. Free and read-only.

| Method                | HTTP                     | Scope    |
| --------------------- | ------------------------ | -------- |
| [`list`](#list)       | `GET /v1/chats`          | `emails` |
| [`listAll`](#listall) | `GET /v1/chats` (paged)  | `emails` |
| [`get`](#get)         | `GET /v1/chats/{chatId}` | `emails` |

> **New in 11.6.0.** `list` and `listAll` are the typed replacement for
> reading chats through `brew.data.run`, which the API is retiring.

---

## `list`

The brand's chats, most recently active first, under `{ data, pagination }`,
as the app's chat list shows them. Rows carry no transcript and no
participants; [`get`](#get) returns a chat's recent messages.

```ts
type ChatSummary = {
  readonly chatId: string
  readonly title: string | null
  readonly firstUserPrompt: string | null // cut at 80 characters
  readonly lastAssistantPreview: string | null // cut at 140 characters
  // 'streaming' or 'background_finalizing' while a run is still going;
  // null before the first run.
  readonly status: ChatStatus
  readonly origin: 'slack' | null // null for the Brew web app
  readonly updatedAt: string // ISO-8601
  readonly url: string // opens the chat in Brew
}

type ListChatsInput = {
  readonly limit?: number // 1–100, default 100
  readonly cursor?: string
}
```

```ts
const { data } = await brew.chats.list({ limit: 10 })
for (const chat of data) {
  console.log(chat.title ?? chat.firstUserPrompt, chat.status)
}
```

The `cursor` is an opaque native cursor of up to 8,192 characters. Pass it
back unchanged.

### Errors

- **`400 INVALID_REQUEST`**: an unknown query key or a malformed cursor.

## `listAll`

Async iterator over every chat, most recently active first. `limit` is the
per-page size; the iterator owns the cursor and stops fetching when
`options.signal` aborts.

```ts
for await (const chat of brew.chats.listAll()) {
  if (chat.origin === 'slack') console.log(chat.chatId, chat.title)
}
```

## `get`

One chat as a digest for resuming the conversation: its identity
(`chatId`, `title`, `modelId`, `updatedAt`, `messageCount`), the
`artifacts[]` it created or referenced (each an `email` or `automation`
with its latest `title` and an optional preview `imageUrl`), the
`triggerEventIds[]` it touched, and `recentMessages[]` (a trimmed tail of
the transcript).

```ts
const chat = await brew.chats.get('Hk2mZ8t9QbY3sW1vR0pLd')
for (const artifact of chat.artifacts) {
  console.log(artifact.type, artifact.id, artifact.title)
}
```

### Errors

- **`404 CHAT_NOT_FOUND`**: the id is unknown OR belongs to a different
  brand.

Pass `{ raw: true }` in `options` on `list` or `get` to receive the full
`BrewRawResponse<T>` (status, headers, request id) instead of the
unwrapped payload.
