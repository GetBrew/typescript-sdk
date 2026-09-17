import type { HttpClient } from '../../core/http'

import { createAuditEmail } from './audit'
import { createPreviewEmailClients } from './client-previews'
import { createCloneEmail } from './clone'
import { createDeleteEmail } from './delete'
import { createEditEmail } from './edit'
import { createExportEmail } from './export'
import { createImportFigmaDesign } from './figma'
import { createGenerateEmail } from './generate'
import { createGetEmail } from './get'
import { createImportEmail } from './import'
import {
  createInboxPlacementTestsResource,
  type InboxPlacementTestsResource,
} from './inbox-placement-tests/resource'
import { createListEmails } from './list'
import { createRestoreEmail } from './restore'
import { createSendEmail } from './send'

export type EmailsResource = {
  /** `GET /v1/emails` — the latest version of each design, lean; filter by `status`, `groupId`, the `from` / `to` window, and `sortBy` (scope: `emails`). */
  readonly list: ReturnType<typeof createListEmails>
  /** `GET /v1/emails/{emailId}` — one design as the bare row; `include: 'html' | 'versions'` attaches the rendered HTML / version history (scope: `emails`). */
  readonly get: ReturnType<typeof createGetEmail>
  /** `POST /v1/emails` — generate an email from a prompt (scope: `emails`). */
  readonly generate: ReturnType<typeof createGenerateEmail>
  /** `POST /v1/emails/import` — import existing `html`/`jsx` as a new editable design (scope: `emails`). */
  readonly import: ReturnType<typeof createImportEmail>
  /** `POST /v1/emails/figma` — deterministically convert a Figma frame into a new editable design; no model in the loop, and FREE (scope: `emails`). */
  readonly importFigma: ReturnType<typeof createImportFigmaDesign>
  /** `POST /v1/emails/{emailId}/clone` — duplicate a design (optionally an exact historical version) into a new one (scope: `emails`). */
  readonly clone: ReturnType<typeof createCloneEmail>
  /** `PATCH /v1/emails/{emailId}` — AI edit an existing email (new latest version) (scope: `emails`). */
  readonly edit: ReturnType<typeof createEditEmail>
  /** `POST /v1/emails/{emailId}/restore` — non-destructive version restore by `emailVersionId` (scope: `emails`). */
  readonly restore: ReturnType<typeof createRestoreEmail>
  /** `DELETE /v1/emails/{emailId}` — idempotent hard-delete of all versions (scope: `emails`). */
  readonly delete: ReturnType<typeof createDeleteEmail>
  /** `POST /v1/emails/audit` — lint raw content for production readiness; complete results cost 5 credits and partial results cost 0 (scope: `emails`). */
  readonly auditEmail: ReturnType<typeof createAuditEmail>
  /** `POST /v1/emails/{emailId}/client-previews` — render the design in real inboxes/devices (Gmail, Outlook, Apple Mail, iOS — light & dark) → a screenshot per client; fixed 10 credits, billed only when ≥1 renders (scope: `emails`). */
  readonly previewClients: ReturnType<typeof createPreviewEmailClients>
  /** `/v1/emails/{emailId}/inbox-placement-tests` — create a seed-list placement test, list a design's recent tests, and poll ONE by `testId` (scope: `emails`). */
  readonly inboxPlacementTests: InboxPlacementTestsResource
  /** `POST /v1/emails/{emailId}/export` — export the design to a connected ESP as a template; `dryRun` validates without writing (scope: `emails`). */
  readonly export: ReturnType<typeof createExportEmail>
  /** `POST /v1/sends` — the single polymorphic send: campaign by default, or a one-off TEST delivery via `test: true` (scope: `sends`). */
  readonly send: ReturnType<typeof createSendEmail>
}

export function createEmailsResource(client: HttpClient): EmailsResource {
  return {
    list: createListEmails(client),
    get: createGetEmail(client),
    generate: createGenerateEmail(client),
    import: createImportEmail(client),
    importFigma: createImportFigmaDesign(client),
    clone: createCloneEmail(client),
    edit: createEditEmail(client),
    restore: createRestoreEmail(client),
    delete: createDeleteEmail(client),
    auditEmail: createAuditEmail(client),
    previewClients: createPreviewEmailClients(client),
    inboxPlacementTests: createInboxPlacementTestsResource(client),
    export: createExportEmail(client),
    send: createSendEmail(client),
  }
}
