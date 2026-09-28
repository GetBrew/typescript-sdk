import type { HttpClient } from '../../../core/http'

import { createAddDomainUnsubscribes } from './add'
import { createExportDomainUnsubscribes } from './export'
import { createImportDomainUnsubscribes } from './import'
import { createListDomainUnsubscribes } from './list'
import { createRemoveDomainUnsubscribe } from './remove'

export type DomainUnsubscribesResource = {
  /** `GET /v1/domains/{domainId}/unsubscribes` — one page of a marketing domain's list, newest first; `q` searches, `scope` narrows (scope: `domains`). */
  readonly list: ReturnType<typeof createListDomainUnsubscribes>
  /** `POST /v1/domains/{domainId}/unsubscribes` — suppress up to 1,000 addresses from THIS domain's mail; idempotent per address (scope: `domains`). */
  readonly add: ReturnType<typeof createAddDomainUnsubscribes>
  /** `DELETE /v1/domains/{domainId}/unsubscribes/{email}` — take ONE address off this domain's list; never clears the brand-wide opt-out (scope: `domains`). */
  readonly remove: ReturnType<typeof createRemoveDomainUnsubscribe>
  /** `POST /v1/domains/{domainId}/unsubscribes/import` — migrate another ESP's CSV export into this domain's list; 10,000 rows per call (scope: `domains`). */
  readonly import: ReturnType<typeof createImportDomainUnsubscribes>
  /** `GET /v1/domains/{domainId}/unsubscribes/export` — the whole list as CSV text inside the JSON envelope (scope: `domains`). */
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
