import type { operations } from '../../generated/openapi-types'

/**
 * The brand-scoped chat digest returned by `GET /v1/chats/{chatId}`
 * (`brew.chats.get(chatId)`).
 *
 * The endpoint has an inline response schema (no named component), so the
 * type is derived directly from the generated `getChatContext` operation:
 * the success body is `operations['getChatContext']['responses'][200]`'s
 * `application/json` content.
 *
 * Shape: chat identity (`chatId`, `title`, `modelId`, `updatedAt`,
 * `messageCount`), the `artifacts[]` it created/referenced (each an
 * `email` or `automation` with `id`, `title`, and an optional preview
 * `imageUrl`), the `triggerEventIds[]` it touched, and `recentMessages[]`
 * — a trimmed tail of the transcript. `title` / `modelId` / `updatedAt`
 * are nullable.
 */
export type ChatContextResponse =
  operations['getChatContext']['responses'][200]['content']['application/json']

/**
 * One entry of `ChatContextResponse.artifacts[]` — an `email` or
 * `automation` the chat created or referenced, with an optional preview
 * `imageUrl`.
 */
export type ChatArtifact = ChatContextResponse['artifacts'][number]

/**
 * One entry of `ChatContextResponse.recentMessages[]` — a single turn of
 * the trimmed transcript tail (`role` + `text`).
 */
export type ChatMessage = ChatContextResponse['recentMessages'][number]
