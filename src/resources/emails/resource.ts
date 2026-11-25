import type { HttpClient } from '../../core/http'

import { createAuditEmail } from './audit'
import { createPreviewEmailClients } from './client-previews'
import { createCloneEmail } from './clone'
import {
  createEmailCommentsResource,
  type EmailCommentsResource,
} from './comments/resource'
import { createDeleteEmail } from './delete'
import { createEditEmail } from './edit'
import { createExportEmail } from './export'
import { createImportFigmaDesign } from './figma'
import { createGenerateEmail } from './generate'
import { createGetEmail } from './get'
import { createGetEmailAudit } from './get-audit'
import { createGetEmailClientPreview } from './get-client-preview'
import { createImportEmailImage } from './image'
import { createImportEmail } from './import'
import {
  createInboxPlacementTestsResource,
  type InboxPlacementTestsResource,
} from './inbox-placement-tests/resource'
import { createListEmails } from './list'
import { createRestoreEmail } from './restore'
import { createSendEmail } from './send'

export type EmailsResource = {
  readonly list: ReturnType<typeof createListEmails>
  readonly get: ReturnType<typeof createGetEmail>
  readonly generate: ReturnType<typeof createGenerateEmail>
  readonly import: ReturnType<typeof createImportEmail>
  readonly importFigma: ReturnType<typeof createImportFigmaDesign>
  readonly importImage: ReturnType<typeof createImportEmailImage>
  readonly clone: ReturnType<typeof createCloneEmail>
  readonly edit: ReturnType<typeof createEditEmail>
  readonly restore: ReturnType<typeof createRestoreEmail>
  readonly delete: ReturnType<typeof createDeleteEmail>
  readonly auditEmail: ReturnType<typeof createAuditEmail>
  readonly getAudit: ReturnType<typeof createGetEmailAudit>
  readonly previewClients: ReturnType<typeof createPreviewEmailClients>
  readonly getClientPreview: ReturnType<typeof createGetEmailClientPreview>
  readonly inboxPlacementTests: InboxPlacementTestsResource
  readonly comments: EmailCommentsResource
  readonly export: ReturnType<typeof createExportEmail>
  readonly send: ReturnType<typeof createSendEmail>
}

export function createEmailsResource(client: HttpClient): EmailsResource {
  return {
    list: createListEmails(client),
    get: createGetEmail(client),
    generate: createGenerateEmail(client),
    import: createImportEmail(client),
    importFigma: createImportFigmaDesign(client),
    importImage: createImportEmailImage(client),
    clone: createCloneEmail(client),
    edit: createEditEmail(client),
    restore: createRestoreEmail(client),
    delete: createDeleteEmail(client),
    auditEmail: createAuditEmail(client),
    getAudit: createGetEmailAudit(client),
    previewClients: createPreviewEmailClients(client),
    getClientPreview: createGetEmailClientPreview(client),
    inboxPlacementTests: createInboxPlacementTestsResource(client),
    comments: createEmailCommentsResource(client),
    export: createExportEmail(client),
    send: createSendEmail(client),
  }
}
