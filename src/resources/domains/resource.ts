import type { HttpClient } from '../../core/http'

import { createAddDomain } from './add'
import { createDeleteDomain } from './delete'
import { createGetDomain } from './get'
import { createGetDomainHealth } from './health'
import { createListDomains } from './list'
import { createUpdateDomainSettings } from './settings'
import {
  createDomainUnsubscribesResource,
  type DomainUnsubscribesResource,
} from './unsubscribes/resource'
import { createVerifyDomain } from './verify'

export type DomainsResource = {
  readonly list: ReturnType<typeof createListDomains>
  readonly get: ReturnType<typeof createGetDomain>
  readonly add: ReturnType<typeof createAddDomain>
  readonly verify: ReturnType<typeof createVerifyDomain>
  readonly health: ReturnType<typeof createGetDomainHealth>
  readonly updateSettings: ReturnType<typeof createUpdateDomainSettings>
  readonly delete: ReturnType<typeof createDeleteDomain>
  readonly unsubscribes: DomainUnsubscribesResource
}

export function createDomainsResource(client: HttpClient): DomainsResource {
  return {
    list: createListDomains(client),
    get: createGetDomain(client),
    add: createAddDomain(client),
    verify: createVerifyDomain(client),
    health: createGetDomainHealth(client),
    updateSettings: createUpdateDomainSettings(client),
    delete: createDeleteDomain(client),
    unsubscribes: createDomainUnsubscribesResource(client),
  }
}
