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
  /** `GET /v1/domains` — every sending domain; `sendableOnly: true` narrows to verified send-ready ones, `sendingPurpose` to marketing or transactional (scope: `domains`). */
  readonly list: ReturnType<typeof createListDomains>
  /** `GET /v1/domains/{domainId}` — one domain as the bare row, with its DNS `records` (scope: `domains`). */
  readonly get: ReturnType<typeof createGetDomain>
  /** `POST /v1/domains` — add a domain (returns pending + DNS records) (scope: `domains`). */
  readonly add: ReturnType<typeof createAddDomain>
  /** `POST /v1/domains/{domainId}/verify` — re-check DNS + persist status (scope: `domains`). */
  readonly verify: ReturnType<typeof createVerifyDomain>
  /** `GET /v1/domains/{domainId}/health` — aggregate deliverability health and signals; `include` `scoreHistory` / `scoreRuns` adds saved score snapshots and the last automated score runs (scope: `domains`). */
  readonly health: ReturnType<typeof createGetDomainHealth>
  /** `PATCH /v1/domains/{domainId} { default*… }` — set sender defaults (scope: `domains`). */
  readonly updateSettings: ReturnType<typeof createUpdateDomainSettings>
  /** `DELETE /v1/domains/{domainId}` — idempotent remove (scope: `domains`). */
  readonly delete: ReturnType<typeof createDeleteDomain>
  /** A marketing domain's own unsubscribe list: `list`, `add`, `remove`, `import`, `export` (scope: `domains`). */
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
