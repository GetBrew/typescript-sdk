import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ChatContextResponse } from './types'

export type { ChatContextResponse }

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
