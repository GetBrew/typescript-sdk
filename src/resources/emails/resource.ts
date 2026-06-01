import type { HttpClient } from '../../core/http'

import { createDeleteEmail } from './delete'
import { createEditEmail } from './edit'
import { createGenerateEmail } from './generate'
import { createGetEmail, createListEmailVersions } from './get'
import { createListEmails } from './list'
import { createRestoreEmail } from './restore'

export type EmailsResource = {
  /** `POST /v1/emails` — generate an email from a prompt. */
  readonly generate: ReturnType<typeof createGenerateEmail>
  /** `PATCH /v1/emails` — AI edit an existing email (new latest version). */
  readonly edit: ReturnType<typeof createEditEmail>
  /** `PATCH /v1/emails { restoreVersion }` — non-destructive version restore. */
  readonly restore: ReturnType<typeof createRestoreEmail>
  /** `GET /v1/emails` — list latest emails for the brand. */
  readonly list: ReturnType<typeof createListEmails>
  /** `GET /v1/emails?emailId=…` — single email (one-element envelope). */
  readonly get: ReturnType<typeof createGetEmail>
  /** `GET /v1/emails?emailId=…&include=versions` — email + version history. */
  readonly versions: ReturnType<typeof createListEmailVersions>
  /** `DELETE /v1/emails` — idempotent hard-delete of all versions. */
  readonly delete: ReturnType<typeof createDeleteEmail>
}

export function createEmailsResource(client: HttpClient): EmailsResource {
  return {
    generate: createGenerateEmail(client),
    edit: createEditEmail(client),
    restore: createRestoreEmail(client),
    list: createListEmails(client),
    get: createGetEmail(client),
    versions: createListEmailVersions(client),
    delete: createDeleteEmail(client),
  }
}
