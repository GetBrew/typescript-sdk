import type { HttpClient } from '../../../core/http'

import { createAddDomainUnsubscribes } from './add'
import { createExportDomainUnsubscribes } from './export'
import { createImportDomainUnsubscribes } from './import'
import { createListDomainUnsubscribes } from './list'
import { createRemoveDomainUnsubscribe } from './remove'

export type DomainUnsubscribesResource = {
  readonly list: ReturnType<typeof createListDomainUnsubscribes>
  readonly add: ReturnType<typeof createAddDomainUnsubscribes>
  readonly remove: ReturnType<typeof createRemoveDomainUnsubscribe>
  readonly import: ReturnType<typeof createImportDomainUnsubscribes>
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
