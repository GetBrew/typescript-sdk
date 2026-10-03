import { autoPaginate, pageReadOptions } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ChatsListResponse, ChatSummary, ListChatsInput } from './types'

export type { ChatsListResponse, ListChatsInput }

/**
 * `GET /v1/chats` (scope: `emails`) — the brand's Brew chats, most recently
 * active first, under `{ data, pagination }`, as the app's chat list shows
 * them: `chatId`, `title`, the opening prompt, Brew's latest reply,
 * `status` (still streaming or not), `origin` (the chat app it started in;
 * `null` for the Brew web app) and a link. No transcript and no
 * participants. Free.
 *
 * Use it to find a chat to resume — `brew.chats.get(chatId)` returns one
 * chat with its artifacts and recent messages — or to see what was worked
 * on recently. Page with `limit` (1–100, default 100) and `cursor`, an
 * opaque native cursor (up to 8,192 characters) to pass back unchanged; to
 * walk every chat use `brew.chats.listAll`. An unknown query key or a
 * malformed cursor is `400 INVALID_REQUEST`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ChatsListResponse>` instead of the unwrapped page.
 */
export function createListChats(client: HttpClient) {
  function listChats(
    input: ListChatsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ChatsListResponse>>
  function listChats(
    input?: ListChatsInput,
    options?: RequestOptions
  ): Promise<ChatsListResponse>
  async function listChats(
    input: ListChatsInput = {},
    options?: RequestOptions
  ): Promise<ChatsListResponse | BrewRawResponse<ChatsListResponse>> {
    const response = await client.request<ChatsListResponse>({
      method: 'GET',
      path: '/v1/chats',
      query: {
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listChats
}

/**
 * Input to `brew.chats.listAll(...)`: `limit` (the per-page size, not a
 * total cap) without `cursor` — the iterator owns cursor state.
 */
export type ListAllChatsInput = Readonly<Omit<ListChatsInput, 'cursor'>>

/**
 * Async iterator over every chat, most recently active first, yielding one
 * `ChatSummary` at a time. Follows `pagination.cursor` until `hasMore` is
 * `false`; honors `options.signal` between pages.
 *
 * ```ts
 * for await (const chat of brew.chats.listAll()) {
 *   console.log(chat.chatId, chat.title)
 * }
 * ```
 */
export function createListAllChats(client: HttpClient) {
  const list = createListChats(client)

  return function listAllChats(
    input: ListAllChatsInput = {},
    options?: RequestOptions
  ): AsyncGenerator<ChatSummary, void, void> {
    return autoPaginate<ChatSummary>(
      async (cursor) => {
        const pageInput: ListChatsInput = {
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
