import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ChatContextResponse } from './types'

export type { ChatContextResponse }

/**
 * `GET /v1/chats/{chatId}` — a FREE, read-only brand-scoped digest of a
 * Brew chat, for resuming the conversation in an external agent. Requires
 * the `emails` scope.
 *
 * Returns the chat identity (`chatId`, `title`, `modelId`, `updatedAt`,
 * `messageCount`), the `artifacts[]` it created/referenced (each an
 * `email` or `automation` with its latest-version `title` and an optional
 * preview `imageUrl`), the `triggerEventIds[]` it touched, and
 * `recentMessages[]` — a trimmed tail of the transcript. No credits, no
 * side effects. A `404 CHAT_NOT_FOUND` means the id is unknown OR belongs
 * to a different brand.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ChatContextResponse>` instead of the unwrapped
 * payload.
 */
export function createGetChat(client: HttpClient) {
  function getChat(
    chatId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ChatContextResponse>>
  function getChat(
    chatId: string,
    options?: RequestOptions
  ): Promise<ChatContextResponse>
  async function getChat(
    chatId: string,
    options?: RequestOptions
  ): Promise<ChatContextResponse | BrewRawResponse<ChatContextResponse>> {
    const response = await client.request<ChatContextResponse>({
      method: 'GET',
      path: `/v1/chats/${encodeURIComponent(chatId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getChat
}
