import type { HttpClient } from '../../core/http'

import { createAuditEmailAccessibility } from './accessibility-audit'
import { createDeleteEmail } from './delete'
import { createEditEmail } from './edit'
import { createGenerateEmail } from './generate'
import { createGetEmail, createListEmailVersions } from './get'
import { createListEmails } from './list'
import { createPreviewEmail } from './preview'
import { createRestoreEmail } from './restore'
import { createSendEmail } from './send'
import { createSendTestEmail } from './send-test'

export type EmailsResource = {
  /** `POST /v1/emails` — generate an email from a prompt. */
  readonly generate: ReturnType<typeof createGenerateEmail>
  /** `PATCH /v1/emails` — AI edit an existing email (new latest version). */
  readonly edit: ReturnType<typeof createEditEmail>
  /** `POST /v1/emails/{emailId}/restore` — non-destructive version restore. */
  readonly restore: ReturnType<typeof createRestoreEmail>
  /** `GET /v1/emails` — list latest emails for the brand (`{ data, pagination }`). */
  readonly list: ReturnType<typeof createListEmails>
  /** `GET /v1/emails/{emailId}` — single email design (`EmailDetail`). */
  readonly get: ReturnType<typeof createGetEmail>
  /** `GET /v1/emails/{emailId}/versions` — paged version history (`{ data, pagination }`). */
  readonly versions: ReturnType<typeof createListEmailVersions>
  /** `DELETE /v1/emails/{emailId}` — idempotent hard-delete of all versions. */
  readonly delete: ReturnType<typeof createDeleteEmail>
  /** `POST /v1/emails/{emailId}/preview` — render the latest version to a hosted PNG at one/both device widths (credit-metered) (scope: `emails`). */
  readonly preview: ReturnType<typeof createPreviewEmail>
  /** `GET /v1/emails/{emailId}/accessibility-audit` — free WCAG 2.1 rule-based audit (`score`, `summary`, `issues`) (scope: `emails`). */
  readonly auditAccessibility: ReturnType<typeof createAuditEmailAccessibility>
  /** `POST /v1/sends` — send a saved email design to a target (audience or inline `to`); async send job (HTTP 202) (scope: `sends`). */
  readonly send: ReturnType<typeof createSendEmail>
  /** `POST /v1/sends/test` — one-off [TEST] delivery of a design to a single address (HTTP 200) (scope: `sends`). */
  readonly sendTest: ReturnType<typeof createSendTestEmail>
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
    preview: createPreviewEmail(client),
    auditAccessibility: createAuditEmailAccessibility(client),
    send: createSendEmail(client),
    sendTest: createSendTestEmail(client),
  }
}
