import type { HttpClient } from '../../../core/http'

import {
  createListAllEmailCommentMessages,
  createListEmailComments,
} from './list'

export type EmailCommentsResource = {
  readonly list: ReturnType<typeof createListEmailComments>
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
