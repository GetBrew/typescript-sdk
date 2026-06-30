import type { HttpClient } from '../../core/http'

import { createGetChat } from './get'

export type ChatsResource = {
  /** `GET /v1/chats/{chatId}` — a free, read-only brand-scoped digest of a Brew chat (identity, the emails/automations it created/referenced, trigger events, and a trimmed transcript tail) for resuming the conversation in an external agent; `404 CHAT_NOT_FOUND` for unknown or cross-brand ids (scope: `emails`). */
  readonly get: ReturnType<typeof createGetChat>
}

export function createChatsResource(client: HttpClient): ChatsResource {
  return {
    get: createGetChat(client),
  }
}
