import { autoPaginate, pageReadOptions } from '../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ChatsListResponse, ChatSummary, ListChatsInput } from './types'

export type { ChatsListResponse, ListChatsInput }

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

export type ListAllChatsInput = Readonly<Omit<ListChatsInput, 'cursor'>>

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
