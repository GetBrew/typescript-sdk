import type { HttpClient } from '../../core/http'

import { createGetChat } from './get'
import { createListAllChats, createListChats } from './list'

export type ChatsResource = {
  /** `GET /v1/chats` — the brand's Brew chats, most recently active first (title, opening prompt, latest reply, run status, origin, link); free (scope: `emails`). */
  readonly list: ReturnType<typeof createListChats>
  /** Auto-pager over `list` — yields every `ChatSummary`. */
  readonly listAll: ReturnType<typeof createListAllChats>
  /** `GET /v1/chats/{chatId}` — a free, read-only brand-scoped digest of a Brew chat (identity, the emails/automations it created/referenced, trigger events, and a trimmed transcript tail) for resuming the conversation in an external agent; `404 CHAT_NOT_FOUND` for unknown or cross-brand ids (scope: `emails`). */
  readonly get: ReturnType<typeof createGetChat>
}

export function createChatsResource(client: HttpClient): ChatsResource {
  return {
    list: createListChats(client),
    listAll: createListAllChats(client),
    get: createGetChat(client),
  }
}
