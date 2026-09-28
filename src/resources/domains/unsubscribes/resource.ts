import type { HttpClient } from '../../../core/http'

import { createAddDomainUnsubscribes } from './add'
import { createExportDomainUnsubscribes } from './export'
import { createImportDomainUnsubscribes } from './import'
import { createListDomainUnsubscribes } from './list'
import { createRemoveDomainUnsubscribe } from './remove'

export type DomainUnsubscribesResource = {
  /** `GET /v1/domains/{domainId}/unsubscribes` — one page of a marketing domain's unsubscribe list (scope: `domains`). */
  readonly list: ReturnType<typeof createListDomainUnsubscribes>
  /** `POST /v1/domains/{domainId}/unsubscribes` — suppress up to 1,000 addresses from this domain's mail (scope: `domains`). */
  readonly add: ReturnType<typeof createAddDomainUnsubscribes>
  /** `DELETE /v1/domains/{domainId}/unsubscribes/{email}` — take one address off this domain's list (scope: `domains`). */
  readonly remove: ReturnType<typeof createRemoveDomainUnsubscribe>
  /** `POST /v1/domains/{domainId}/unsubscribes/import` — add every address in a CSV (scope: `domains`). */
  readonly import: ReturnType<typeof createImportDomainUnsubscribes>
  /** `GET /v1/domains/{domainId}/unsubscribes/export` — the list as CSV text, `truncated` when capped (scope: `domains`). */
  readonly export: ReturnType<typeof createExportDomainUnsubscribes>
}

export function createDomainUnsubscribesResource(
  client: HttpClient
): DomainUnsubscribesResource {
  return {
    list: createListDomainUnsubscribes(client),
    add: createAddDomainUnsubscribes(client),
    remove: createRemoveDomainUnsubscribe(client),
    import: createImportDomainUnsubscribes(client),
    export: createExportDomainUnsubscribes(client),
  }
}
