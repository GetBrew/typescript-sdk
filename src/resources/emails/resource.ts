import type { HttpClient } from '../../core/http'

import { createAuditEmailAccessibility } from './accessibility-audit'
import { createPreviewEmailClients } from './client-previews'
import { createDeleteEmail } from './delete'
import { createEditEmail } from './edit'
import { createGenerateEmail } from './generate'
import { createImportEmail } from './import'
import { createListEmails } from './list'
import { createRestoreEmail } from './restore'
import { createSendEmail } from './send'

export type EmailsResource = {
  /** `GET /v1/emails` — the single email read. List designs (omit `emailId`), or fetch one (`emailId` → single-row page); `include: 'html' | 'versions'` opt-in expansions are detail-only (scope: `emails`). */
  readonly list: ReturnType<typeof createListEmails>
  /** `POST /v1/emails` — generate an email from a prompt (scope: `emails`). */
  readonly generate: ReturnType<typeof createGenerateEmail>
  /** `POST /v1/emails/import` — import existing `html`/`jsx` as a new editable design (scope: `emails`). */
  readonly import: ReturnType<typeof createImportEmail>
  /** `PATCH /v1/emails/{emailId}` — AI edit an existing email (new latest version) (scope: `emails`). */
  readonly edit: ReturnType<typeof createEditEmail>
  /** `POST /v1/emails/{emailId}/restore` — non-destructive version restore (scope: `emails`). */
  readonly restore: ReturnType<typeof createRestoreEmail>
  /** `DELETE /v1/emails/{emailId}` — idempotent hard-delete of all versions (scope: `emails`). */
  readonly delete: ReturnType<typeof createDeleteEmail>
  /** `GET /v1/emails/{emailId}/accessibility-audit` — free WCAG 2.1 rule-based audit (`score`, `summary`, `issues`) (scope: `emails`). */
  readonly auditAccessibility: ReturnType<typeof createAuditEmailAccessibility>
  /** `POST /v1/emails/{emailId}/client-previews` — render the design in real inboxes/devices (Gmail, Outlook, Apple Mail, iOS — light & dark) → a screenshot per client; fixed 10 credits, billed only when ≥1 renders (scope: `emails`). */
  readonly previewClients: ReturnType<typeof createPreviewEmailClients>
  /** `POST /v1/sends` — the single polymorphic send: campaign by default, or a one-off TEST delivery via `test: true` (scope: `sends`). */
  readonly send: ReturnType<typeof createSendEmail>
}

export function createEmailsResource(client: HttpClient): EmailsResource {
  return {
    list: createListEmails(client),
    generate: createGenerateEmail(client),
    import: createImportEmail(client),
    edit: createEditEmail(client),
    restore: createRestoreEmail(client),
    delete: createDeleteEmail(client),
    auditAccessibility: createAuditEmailAccessibility(client),
    previewClients: createPreviewEmailClients(client),
    send: createSendEmail(client),
  }
}
