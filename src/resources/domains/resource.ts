import type { HttpClient } from '../../core/http'

import { createAddDomain } from './add'
import { createDeleteDomain } from './delete'
import { createGetDomainHealth } from './health'
import { createListDomains } from './list'
import { createUpdateDomainSettings } from './settings'
import { createVerifyDomain } from './verify'

export type DomainsResource = {
  /** `GET /v1/domains` — the single domains read. List all (omit `domainId`; pass `sendableOnly: true` for verified send-ready only), or fetch one (`domainId` → single-row page) (scope: `domains`). */
  readonly list: ReturnType<typeof createListDomains>
  /** `POST /v1/domains` — add a domain (returns pending + DNS records) (scope: `domains`). */
  readonly add: ReturnType<typeof createAddDomain>
  /** `POST /v1/domains/{domainId}/verify` — re-check DNS + persist status (scope: `domains`). */
  readonly verify: ReturnType<typeof createVerifyDomain>
  /** `GET /v1/domains/{domainId}/health` — aggregate deliverability health and signals (scope: `domains`). */
  readonly health: ReturnType<typeof createGetDomainHealth>
  /** `PATCH /v1/domains/{domainId} { default*… }` — set sender defaults (scope: `domains`). */
  readonly updateSettings: ReturnType<typeof createUpdateDomainSettings>
  /** `DELETE /v1/domains/{domainId}` — idempotent remove (scope: `domains`). */
  readonly delete: ReturnType<typeof createDeleteDomain>
}

export function createDomainsResource(client: HttpClient): DomainsResource {
  return {
    list: createListDomains(client),
    add: createAddDomain(client),
    verify: createVerifyDomain(client),
    health: createGetDomainHealth(client),
    updateSettings: createUpdateDomainSettings(client),
    delete: createDeleteDomain(client),
  }
}
