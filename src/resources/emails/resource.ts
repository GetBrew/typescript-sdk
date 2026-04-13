import type { HttpClient } from '../../core/http'

import { createGenerateEmail } from './generate'
import { createListEmails } from './list'

export type EmailsResource = {
  readonly generate: ReturnType<typeof createGenerateEmail>
  readonly list: ReturnType<typeof createListEmails>
}

export function createEmailsResource(client: HttpClient): EmailsResource {
  return {
    generate: createGenerateEmail(client),
    list: createListEmails(client),
  }
}
