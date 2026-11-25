import type { HttpClient } from '../../core/http'

import { createGetChat } from './get'
import { createListAllChats, createListChats } from './list'

export type ChatsResource = {
  readonly list: ReturnType<typeof createListChats>
  readonly listAll: ReturnType<typeof createListAllChats>
  readonly get: ReturnType<typeof createGetChat>
}

export function createChatsResource(client: HttpClient): ChatsResource {
  return {
    list: createListChats(client),
    listAll: createListAllChats(client),
    get: createGetChat(client),
  }
}
