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

/**
 * The page `GET /v1/chats` returns (`brew.chats.list()`): the brand's
 * chats, most recently active first, under `{ data, pagination }`.
 * Derived from the generated `listChats` operation so a rename of the
 * response component cannot break it.
 */
export type ChatsListResponse =
  operations['listChats']['responses'][200]['content']['application/json']

/**
 * One chat as the app's chat list shows it: `chatId` (resume it with
 * `brew.chats.get(chatId)`), `title`, `firstUserPrompt` (cut at 80
 * characters), `lastAssistantPreview` (cut at 140), `status` (`streaming`
 * or `background_finalizing` while a run is still going; `null` before the
 * first run), `origin` (the chat app it started in; `null` for the Brew
 * web app), `updatedAt` and `url`. No transcript and no participants.
 */
export type ChatSummary = ChatsListResponse['data'][number]

/** A chat's run state on `ChatSummary.status` (`null` before the first run). */
export type ChatStatus = ChatSummary['status']

/** The generated query `GET /v1/chats` takes: `limit` and `cursor`. */
export type ListChatsInput = Readonly<
  NonNullable<operations['listChats']['parameters']['query']>
>
