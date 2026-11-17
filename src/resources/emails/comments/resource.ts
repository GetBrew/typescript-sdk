import type { HttpClient } from '../../../core/http'

import {
  createListAllEmailCommentMessages,
  createListEmailComments,
} from './list'

export type EmailCommentsResource = {
  /** `GET /v1/emails/{emailId}/comments` — a design's open comment threads, newest activity first; `include: 'messages'` adds each thread's newest messages, `commentId` reads one thread, `messagesCursor` its older messages. `404 EMAIL_NOT_FOUND` / `COMMENT_NOT_FOUND` for an unknown design or thread; free (scope: `emails`). */
  readonly list: ReturnType<typeof createListEmailComments>
  /** Walks ONE thread's `messagesCursor` — yields its messages newest first (scope: `emails`). */
  readonly listAllMessages: ReturnType<typeof createListAllEmailCommentMessages>
}

export function createEmailCommentsResource(
  client: HttpClient
): EmailCommentsResource {
  return {
    list: createListEmailComments(client),
    listAllMessages: createListAllEmailCommentMessages(client),
  }
}
